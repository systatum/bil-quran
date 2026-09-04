from shared import api
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID, uuid4
from typing import Literal, TypeAlias
import dataclasses


def date_field():
    return dataclasses.field(default_factory=lambda: datetime.now(timezone.utc))


def uuid_field():
    return dataclasses.field(default_factory=lambda: uuid4())


@dataclass(kw_only=True)
class Versioned:
    version: Literal["6"] = "6"


@dataclass(kw_only=True)
class TextContent:
    author: str
    text_type: Literal["footnote", "translation", "exegesis"]
    surah: int
    ayah: int
    text: str


@dataclass(kw_only=True)
class TextDataset(Versioned):
    note: str = ""

    created_at: datetime = date_field()
    texts: list[TextContent]


@dataclass(kw_only=True)
class ExperimentPrompt:
    setting: api.internal.PromptSetting
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
    content: TextContent
    text_index: int


@dataclass(kw_only=True)
class ExperimentInput:
    text: ExperimentText
    language: ExperimentLanguage
    setting: ExperimentSetting


@dataclass(kw_only=True)
class ExperimentResult:
    translation: api.internal.Translation
    rating: api.internal.Rating


ExperimentErrorFailedAt: TypeAlias = Literal[
    "translate",
    "rate",
]


@dataclass(kw_only=True)
class ExperimentError:
    message: str
    failed_at: ExperimentErrorFailedAt


@dataclass(kw_only=True)
class ExperimentMetadata:
    created_at: datetime = date_field()
    error: ExperimentError | None = None
    recoverable_errors: list[ExperimentError] = dataclasses.field(default_factory=list)
    elapsed_seconds: float = 0.0

    @property
    def success(self) -> bool:
        return self.error is None


@dataclass(kw_only=True)
class ExperimentTranslatedRecord(Versioned):
    input_: ExperimentInput
    translation: api.internal.Translation | None
    metadata: ExperimentMetadata


@dataclass(kw_only=True)
class ExperimentCompleteRecord(Versioned):
    input_: ExperimentInput
    result: ExperimentResult | None
    metadata: ExperimentMetadata


ExperimentBatchProgress: TypeAlias = Literal["not started", "translated", "complete"]


@dataclass(kw_only=True)
class ExperimentBatch:
    """
    Batching always include all prompt_settings and language_pairs per text
    """

    batch_id: UUID = uuid_field()
    created_at: datetime = date_field()
    model: str
    text_index_start: int
    text_index_end: int  # Inclusive
    progress: ExperimentBatchProgress


ExperimentRunProgress: TypeAlias = Literal["not started", "partial", "complete"]


@dataclass(kw_only=True)
class ExperimentRunMetadata(Versioned):
    run_id: UUID = uuid_field()
    created_at: datetime = date_field()
    note: str = ""

    models: list[str]
    prompt_settings: dict[str, ExperimentPrompt]
    language_pairs: list[ExperimentLanguage]
    texts: list[ExperimentText]

    batches: dict[UUID, ExperimentBatch]
    progress: ExperimentRunProgress


@dataclass(kw_only=True)
class ExperimentRunCommand:
    note: str = ""

    models: list[str]
    prompt_settings: dict[str, api.internal.PromptSetting]
    language_pairs: list[tuple[str, str]]  # Source to target language
    dataset: TextDataset


__all__ = [
    "TextContent",
    "TextDataset",
    "ExperimentPrompt",
    "ExperimentSetting",
    "ExperimentLanguage",
    "ExperimentText",
    "ExperimentInput",
    "ExperimentResult",
    "ExperimentErrorFailedAt",
    "ExperimentError",
    "ExperimentMetadata",
    "ExperimentTranslatedRecord",
    "ExperimentCompleteRecord",
    "ExperimentBatchProgress",
    "ExperimentBatch",
    "ExperimentRunProgress",
    "ExperimentRunMetadata",
    "ExperimentRunCommand",
]
