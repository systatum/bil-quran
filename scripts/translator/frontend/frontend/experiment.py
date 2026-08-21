from frontend.structs import *  # type: ignore . I really don't want to manually import everything
from shared.apiclient import APIClient
from shared import api
from datetime import datetime, timezone
from time import perf_counter
from pathlib import Path
from pydantic import TypeAdapter, ValidationError
from uuid import UUID, uuid4, uuid5
from typing import Optional
import typing
import math
import sys
import os
import colorama


def printerr(*args, **kwargs):
    file = kwargs.pop("file", sys.stderr)
    print(*args, file=file, **kwargs)


def format_and_log_errors(self, fmt: str, *args, **kwargs) -> str:
    value = fmt.format(*args, **kwargs)
    printerr(value, file=sys.stderr)
    return value


class ExperimentRunner:
    _client: APIClient
    base_dirpath: Path = Path("results")

    def __init__(self, client: APIClient):
        self._client = client

    def create(
        self,
        command: ExperimentRunCommand,
        explicit_uuid: UUID | None = None,
        force_new: bool = False,
    ) -> UUID:
        """
        UUID is tied to the lifecycle of the result generation

        Raises:
            ValueError if explicit_uuid and force_new is set
        """
        if explicit_uuid is not None and force_new:
            raise ValueError("Can not set explicit_uuid and force_new at the same time")

        batches = self._create_batches(command)
        run_id: UUID
        if force_new:
            run_id = uuid4()
        elif explicit_uuid is not None:
            run_id = explicit_uuid
        else:
            run_id = uuid5(
                UUID("0" * 32),
                str(TypeAdapter(ExperimentRunCommand).dump_json(command)),
            )

        metadata = self._find_metadata(run_id)
        if metadata is None:
            metadata = self._run_command_to_metadata(command, batches, run_id)
            self._update_metadata(metadata)

        return metadata.run_id

    def run(self, run_id: UUID):
        """
        Raises:
            FileNotFoundError if run cannot be found
        """

        metadata = self._find_metadata(run_id)
        if metadata is None:
            raise FileNotFoundError(f"Cannot find run with id {run_id}")

        run_dir = self._run_dirpath(metadata.created_at)
        batch_ids = list(metadata.batches.keys())
        self._process_run(metadata, batch_ids, run_dir)

    def _process_run(
        self,
        metadata: ExperimentRunMetadata,
        batch_ids: list[UUID],
        run_dir: Path,
    ):
        for i, batch_id in enumerate(batch_ids, 1):
            progress = self._translate_batch(
                metadata,
                batch_id,
                run_dir,
                i,
                len(batch_ids),
            )

            metadata.batches[batch_id].progress = progress
            if metadata.progress == "not started":
                metadata.progress = "partial"
            self._update_metadata(metadata)

        for i, batch_id in enumerate(batch_ids, 1):
            progress = self._rate_batch(
                metadata,
                batch_id,
                run_dir,
                i,
                len(batch_ids),
            )

            metadata.batches[batch_id].progress = progress
            if metadata.progress == "not started":
                metadata.progress = "partial"
            self._update_metadata(metadata)

        metadata.progress = "complete"
        self._update_metadata(metadata)

    def _create_batches(
        self, run: ExperimentRunCommand, batch_size: int = 64
    ) -> list[ExperimentBatch]:
        variant_count_per_model = len(run.language_pairs) * len(run.prompt_settings)
        text_count_per_model_per_batch = math.ceil(batch_size / variant_count_per_model)
        text_count_per_model = variant_count_per_model * len(run.texts)

        batches = []
        for model in run.models:
            for batch_start_index in range(
                0, text_count_per_model, text_count_per_model_per_batch
            ):
                batch_end_index = min(
                    batch_start_index + text_count_per_model_per_batch - 1,
                    len(run.texts) - 1,
                )
                batches.append(
                    ExperimentBatch(
                        model=model,
                        text_index_start=batch_start_index,
                        text_index_end=batch_end_index,
                        progress="not started",
                    )
                )

        return batches

    def _translate_batch(
        self,
        metadata: ExperimentRunMetadata,
        batch_id: UUID,
        run_dir: Path,
        batch_number: int = 1,
        batch_total: int = 1,
    ) -> ExperimentBatchProgress:
        batch: ExperimentBatch = metadata.batches[batch_id]
        if batch.progress != "not started":
            return batch.progress

        batch_dir = self._batch_dirpath(run_dir, batch)
        os.makedirs(batch_dir, exist_ok=True)

        model = batch.model
        done_count = 0
        self._translated_record_filepath(batch_dir).write_bytes(b"")
        for prompt_setting in metadata.prompt_settings.values():
            for language in metadata.language_pairs:
                for text_index in range(
                    batch.text_index_start, batch.text_index_end + 1
                ):
                    text = metadata.texts[text_index]
                    setting = ExperimentSetting(prompt=prompt_setting, model=model)
                    input = ExperimentInput(
                        text=text, language=language, setting=setting
                    )

                    translated = self._translate(input=input, allow_fail=True)
                    with open(
                        self._translated_record_filepath(batch_dir), "ab"
                    ) as file:
                        file.write(
                            TypeAdapter(ExperimentTranslatedRecord).dump_json(
                                translated
                            )
                            + b"\n"
                        )
                    done_count += 1
                    print(
                        colorama.ansi.clear_line(),
                        "\r"
                        "Translating | Batch {}/{} | Model {} | Done {}/{}".format(
                            batch_number,
                            batch_total,
                            model,
                            done_count,
                            len(metadata.prompt_settings)
                            * len(metadata.language_pairs)
                            * (batch.text_index_end - batch.text_index_start + 1),
                        ),
                        end="",
                        flush=True,
                    )
        print()
        return "translated"

    def _rate_batch(
        self,
        metadata: ExperimentRunMetadata,
        batch_id: UUID,
        run_dir: Path,
        batch_number: int = 1,
        batch_total: int = 1,
    ) -> ExperimentBatchProgress:
        batch: ExperimentBatch = metadata.batches[batch_id]
        if batch.progress != "translated":
            return batch.progress

        done_count = 0
        batch_dir = self._batch_dirpath(run_dir, batch)
        record_count = (
            self._translated_record_filepath(batch_dir).read_bytes().count(b"\n")
        )
        self._complete_record_filepath(batch_dir).write_bytes(b"")
        with open(self._translated_record_filepath(batch_dir)) as file:
            for record in file:
                record = TypeAdapter(ExperimentTranslatedRecord).validate_json(record)
                model = record.input_.setting.model

                rated = self._rate(
                    translated=record, metadata=record.metadata, allow_fail=True
                )
                with open(self._complete_record_filepath(batch_dir), "ab") as file:
                    file.write(
                        TypeAdapter(ExperimentCompleteRecord).dump_json(rated) + b"\n"
                    )
                done_count += 1
                if done_count != 1:
                    colorama.ansi.Cursor.UP()
                    colorama.ansi.clear_line()
                print(
                    colorama.ansi.clear_line(),
                    "\r"
                    "Rating | Batch {}/{} | Model {} | Done {}/{}".format(
                        batch_number,
                        batch_total,
                        model,
                        done_count,
                        record_count,
                    ),
                    end="",
                    flush=True,
                )
        print()
        return "complete"

    @classmethod
    def _find_metadata(cls, run_id: UUID) -> Optional[ExperimentRunMetadata]:
        for metadata_path in cls.base_dirpath.glob("*.metadata.json"):
            try:
                metadata = TypeAdapter(ExperimentRunMetadata).validate_json(
                    metadata_path.read_bytes()
                )
            except ValidationError:
                continue
            if metadata.run_id == run_id:
                return metadata
        return None

    @classmethod
    def _update_metadata(cls, metadata: ExperimentRunMetadata):
        cls._metadata_filepath(metadata.created_at).write_bytes(
            TypeAdapter(ExperimentRunMetadata).dump_json(metadata, indent=2)
        )

    @classmethod
    def _run_dirpath(cls, created_at: datetime) -> Path:
        return cls.base_dirpath / (datetime.strftime(created_at, "%Y%m%d_%H%M%S"))

    @classmethod
    def _metadata_filepath(cls, created_at: datetime) -> Path:
        return cls.base_dirpath / (
            datetime.strftime(created_at, "%Y%m%d_%H%M%S") + ".metadata.json"
        )

    @staticmethod
    def _find_batch_dirpath(run_dir: Path, batch_id: UUID) -> Optional[Path]:
        for path in run_dir.glob(f"batch_*_{batch_id}"):
            return path
        return None

    @staticmethod
    def _batch_dirpath(run_dir: Path, batch: ExperimentBatch) -> Path:
        return run_dir / "batch_{}-{}_{}_{}".format(
            batch.text_index_start,
            batch.text_index_end,
            batch.model,
            batch.batch_id,
        )

    @staticmethod
    def _translated_record_filepath(batch_dir: Path) -> Path:
        return batch_dir / "unrated_records.jsonl"

    @staticmethod
    def _complete_record_filepath(batch_dir: Path) -> Path:
        return batch_dir / "complete_records.jsonl"

    @staticmethod
    def _run_command_to_metadata(
        command: ExperimentRunCommand, batches: list[ExperimentBatch], run_id: UUID
    ) -> ExperimentRunMetadata:
        return ExperimentRunMetadata(
            run_id=run_id,
            note=command.note,
            models=command.models,
            prompt_settings={
                name: ExperimentPrompt(setting=command.prompt_settings[name], name=name)
                for name in command.prompt_settings.keys()
            },
            language_pairs=[
                ExperimentLanguage(
                    source_language=source_language, target_language=target_language
                )
                for (source_language, target_language) in command.language_pairs
            ],
            texts=[
                ExperimentText(text=text, text_index=i)
                for i, text in enumerate(command.texts)
            ],
            batches={batch.batch_id: batch for batch in batches},
            progress="not started",
        )

    def _translate(
        self,
        input: ExperimentInput,
        allow_fail: bool = False,
    ) -> ExperimentTranslatedRecord:
        start_time = perf_counter()
        try:
            translation = self._client.translate(
                text=input.text.text,
                source_language=input.language.source_language,
                target_language=input.language.target_language,
                model=input.setting.model,
                prompt_setting=input.setting.prompt.setting,
            )
        except Exception as e:
            if not allow_fail:
                raise

            end_time = perf_counter()

            error_message = format_and_log_errors(
                "Translation failed, {}: {}", type(e).__name__, e
            )
            return ExperimentTranslatedRecord(
                input_=input,
                translation=None,
                metadata=ExperimentMetadata(
                    created_at=datetime.now(timezone.utc),
                    success=False,
                    error=error_message,
                    elapsed_seconds=end_time - start_time,
                ),
            )

        end_time = perf_counter()

        return ExperimentTranslatedRecord(
            input_=input,
            translation=translation,
            metadata=ExperimentMetadata(
                created_at=datetime.now(timezone.utc),
                success=True,
                error=None,
                elapsed_seconds=end_time - start_time,
            ),
        )

    def _rate(
        self,
        translated: ExperimentTranslatedRecord,
        metadata: ExperimentMetadata,
        allow_fail: bool = False,
    ) -> ExperimentCompleteRecord:
        start_time = perf_counter()
        try:
            rating = self._client.rate(
                translated.input_.text.text,
                typing.cast(api.internal.Translation, translated.translation),
            )
        except Exception as e:
            if not allow_fail:
                raise

            end_time = perf_counter()

            error_message = format_and_log_errors(
                "Rating failed, {}: {}", type(e).__name__, e
            )

            return ExperimentCompleteRecord(
                input_=translated.input_,
                result=None,
                metadata=ExperimentMetadata(
                    created_at=datetime.now(timezone.utc),
                    success=False,
                    error=error_message,
                    elapsed_seconds=metadata.elapsed_seconds + (end_time - start_time),
                ),
            )

        end_time = perf_counter()

        result = ExperimentResult(
            translation=typing.cast(api.internal.Translation, translated.translation),
            rating=rating,
        )

        return ExperimentCompleteRecord(
            input_=translated.input_,
            result=result,
            metadata=ExperimentMetadata(
                created_at=datetime.now(timezone.utc),
                success=True,
                error=None,
                elapsed_seconds=metadata.elapsed_seconds + (end_time - start_time),
            ),
        )
