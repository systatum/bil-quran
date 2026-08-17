from my_notebook.structs import *
from my_notebook.apiclient import APIClient
from src import api
from datetime import datetime, timezone
from time import perf_counter
from pathlib import Path
from pydantic import TypeAdapter
import typing
import math
import sys
import os


def metadata_v2_to_internal(
    v2: ExperimentRunMetadataV2,
) -> ExperimentRunMetadataInternal:
    return ExperimentRunMetadataInternal(
        run_id=v2.run_id,
        created_at=v2.created_at,
        note=v2.note,
        models=v2.models,
        prompt_settings={
            name: ExperimentPrompt(setting=v2.prompt_settings[name], name=name)
            for name in v2.prompt_settings.keys()
        },
        language_pairs=[
            ExperimentLanguage(
                source_language=source_language, target_language=target_language
            )
            for (source_language, target_language) in v2.language_pairs
        ],
        texts=[ExperimentText(text=text, text_id=i) for i, text in enumerate(v2.texts)],
    )


def printerr(*args, **kwargs):
    file = kwargs.pop("file", sys.stderr)
    print(*args, file=file, **kwargs)


def format_and_log_errors(self, fmt: str, *args, **kwargs) -> str:
    value = fmt.format(*args, **kwargs)
    printerr(value, file=sys.stderr)
    return value


class ExperimentRunner:
    _client: APIClient

    def __init__(self, client: APIClient):
        self._client = client

    def create_batches(
        self, run: ExperimentRunMetadataV2, batch_size: int = 64
    ) -> list[ExperimentBatchV1]:
        variant_count_per_model = len(run.language_pairs) * len(run.prompt_settings)
        text_count_per_model_per_batch = math.ceil(batch_size / variant_count_per_model)
        text_count_per_model = variant_count_per_model * len(run.texts)

        batches = []
        for model in run.models:
            for batch_start_id in range(
                0, text_count_per_model, text_count_per_model_per_batch
            ):
                batch_end_id = min(
                    batch_start_id + text_count_per_model_per_batch,
                    text_count_per_model_per_batch,
                )
                batches.append(
                    ExperimentBatchV1(
                        run_id=run.run_id,
                        model=model,
                        text_id_start=batch_start_id,
                        text_id_end=batch_end_id - 1,
                    )
                )

        return batches

    def translate_batch(
        self,
        run_: ExperimentRunMetadataV2,
        batch: ExperimentBatchV1,
        base_dir: Path,
        batch_number: int = 1,
        batch_total: int = 1,
    ):
        if batch.translated:
            return

        save_dir = base_dir / self._format_batch(batch)
        os.makedirs(save_dir, exist_ok=True)

        run: ExperimentRunMetadataInternal = metadata_v2_to_internal(run_)

        model = batch.model
        for pi, prompt_setting in enumerate(run.prompt_settings.values(), 1):
            for li, language in enumerate(run.language_pairs, 1):
                for ti, text in enumerate(run.texts, 1):
                    setting = ExperimentSetting(prompt=prompt_setting, model=model)
                    input = ExperimentInput(
                        text=text, language=language, setting=setting
                    )

                    unrated = self._translate(input=input, allow_fail=True)
                    file_name = save_dir / "unrated_records.jsonl"
                    TypeAdapter(ExperimentUnratedRecordV1).validate_python(unrated)
                    with open(file_name, "ab") as file:
                        file.write(
                            TypeAdapter(ExperimentUnratedRecordV1).dump_json(unrated)
                        )
                        file.write(b"\n")
                    print(
                        "Batch {}/{} | Model {} | Prompt {}/{} | Language {}/{} | Text {}/{}\r".format(
                            batch_number,
                            batch_total,
                            model,
                            pi,
                            len(run.prompt_settings.values()),
                            li,
                            len(run.language_pairs),
                            ti,
                            len(run.texts),
                        ),
                        flush=True,
                        end="",
                    )

        batch.translated = True
        file_name = save_dir / "metadata.json"
        TypeAdapter(ExperimentBatchV1).validate_python(batch)
        with open(file_name, "wb") as file:
            file.write(TypeAdapter(ExperimentBatchV1).dump_json(batch))

    @staticmethod
    def _format_batch(batch: ExperimentBatchV1) -> str:
        return "{}_{}_{}_batch_{}_{}".format(
            batch.run_id,
            batch.batch_id,
            batch.model,
            batch.text_id_start,
            batch.text_id_end,
        )

    def _translate(
        self,
        input: ExperimentInput,
        allow_fail: bool = False,
    ) -> ExperimentUnratedRecordV1:
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
            return ExperimentUnratedRecordV1(
                input=input,
                translation=None,
                metadata=ExperimentMetadata(
                    created_at=datetime.now(timezone.utc),
                    success=False,
                    error=error_message,
                    elapsed_seconds=end_time - start_time,
                ),
            )

        end_time = perf_counter()

        return ExperimentUnratedRecordV1(
            input=input,
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
        unrated: ExperimentUnratedRecordV1,
        metadata: ExperimentMetadata,
        allow_fail: bool = False,
    ) -> ExperimentCompleteRecordV2:
        start_time = perf_counter()
        try:
            rating = self._client.rate(
                unrated.input.text.text,
                typing.cast(api.Translation, unrated.translation),
            )
        except Exception as e:
            if not allow_fail:
                raise

            end_time = perf_counter()

            error_message = format_and_log_errors(
                "Rating failed, {}: {}", type(e).__name__, e
            )

            return ExperimentCompleteRecordV2(
                input=unrated.input,
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
            translation=typing.cast(api.Translation, unrated.translation), rating=rating
        )

        return ExperimentCompleteRecordV2(
            input=unrated.input,
            result=result,
            metadata=ExperimentMetadata(
                created_at=datetime.now(timezone.utc),
                success=True,
                error=None,
                elapsed_seconds=metadata.elapsed_seconds + (end_time - start_time),
            ),
        )
