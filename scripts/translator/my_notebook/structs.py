from src import api
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID, uuid4
import dataclasses


def date_field():
    return dataclasses.field(default_factory=lambda: datetime.now(timezone.utc))


def uuid_field():
    return dataclasses.field(default_factory=lambda: uuid4())


@dataclass(kw_only=True)
class ExperimentPrompt:
    setting: api.PromptSetting
    name: str


@dataclass(kw_only=True)
class ExperimentSetting:
    prompt: ExperimentPrompt
    model: str


@dataclass(kw_only=True)
class ExperimentLanguage:
    source_language: str
    target_language: str


@dataclass(kw_only=True)
class ExperimentText:
    text: str
    text_id: int


@dataclass(kw_only=True)
class ExperimentInput:
    text: ExperimentText
    language: ExperimentLanguage
    setting: ExperimentSetting


@dataclass(kw_only=True)
class ExperimentResult:
    translation: api.Translation
    rating: api.Rating


@dataclass(kw_only=True)
class ExperimentMetadata:
    created_at: datetime = date_field()
    success: bool
    error: str | None
    elapsed_seconds: float


@dataclass(kw_only=True)
class ExperimentUnratedRecordV1:
    input: ExperimentInput
    translation: api.Translation | None
    metadata: ExperimentMetadata


@dataclass(kw_only=True)
class ExperimentCompleteRecordV2:
    input: ExperimentInput
    result: ExperimentResult | None
    metadata: ExperimentMetadata


@dataclass(kw_only=True)
class ExperimentBatchV1:
    """
    Batching always include all prompt_settings and language_pairs per text
    """

    batch_id: UUID = uuid_field()
    created_at: datetime = date_field()
    run_id: UUID
    model: str
    text_id_start: int
    text_id_end: int  # Inclusive
    translated: bool = False
    rated: bool = False


@dataclass(kw_only=True)
class ExperimentRunMetadataInternal:
    run_id: UUID = uuid_field()
    created_at: datetime = date_field()
    note: str = ""

    models: list[str]
    prompt_settings: dict[str, ExperimentPrompt]
    language_pairs: list[ExperimentLanguage]
    texts: list[ExperimentText]


@dataclass(kw_only=True)
class ExperimentRunMetadataV2:
    run_id: UUID = uuid_field()
    created_at: datetime = date_field()
    note: str = ""

    models: list[str]
    prompt_settings: dict[str, api.PromptSetting]
    language_pairs: list[tuple[str, str]]  # Source to target language
    texts: list[str]


__all__ = [
    "ExperimentPrompt",
    "ExperimentSetting",
    "ExperimentLanguage",
    "ExperimentText",
    "ExperimentInput",
    "ExperimentResult",
    "ExperimentMetadata",
    "ExperimentUnratedRecordV1",
    "ExperimentCompleteRecordV2",
    "ExperimentBatchV1",
    "ExperimentRunMetadataInternal",
    "ExperimentRunMetadataV2",
]
