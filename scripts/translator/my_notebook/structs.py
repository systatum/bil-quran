from src import api
from dataclasses import dataclass


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
class ExperimentInput:
    text: str
    language: ExperimentLanguage


@dataclass(kw_only=True)
class ExperimentResult:
    translation: api.Translation
    rating: api.Rating


@dataclass(kw_only=True)
class ExperimentMetadata:
    created_at: str
    success: bool
    error: str | None
    elapsed_seconds: float


@dataclass(kw_only=True)
class ExperimentRecord:
    setting: ExperimentSetting
    input: ExperimentInput
    result: ExperimentResult | None
    metadata: ExperimentMetadata


@dataclass(kw_only=True)
class ExperimentRunMetadataV1:
    created_at: str
    source_language: str
    target_language: str

    models: list[str]

    prompt_names: list[str]
    prompt_settings: dict[str, api.PromptSetting]

    sample_count: int

    notes: str = ""
