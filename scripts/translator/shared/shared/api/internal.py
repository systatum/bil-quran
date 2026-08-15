from __future__ import annotations
from shared.api import APIRequest, APIResponse
from typing import TypeAlias, Generic, TypeVar
from dataclasses import dataclass
from uuid import UUID
import uuid
import dataclasses

V = TypeVar("V")
E = TypeVar("E")


@dataclass(kw_only=True)
class Job(Generic[V, E]):
    job_id: UUID = dataclasses.field(default_factory=lambda: uuid.uuid4())


@dataclass(kw_only=True)
class JobResultOk(Generic[V]):
    job: Job[V, None]
    value: V


@dataclass(kw_only=True)
class TranslateJob(Job):
    translate_input: TranslateInput
    setting: PromptSetting
    model: str


@dataclass(kw_only=True)
class PromptSetting:
    system_prompt: str = (
        "You are an assistant who translates. The first line of the input is source and target language specification"
    )
    response_format: dict = dataclasses.field(
        default_factory=lambda: {
            "type": "text",
        }
    )
    prompt_format: str = "{source_language} -> {target_language}\n{text}"

    def __post_init__(self):
        assert self.prompt_format.count("{source_language}") == 1
        assert self.prompt_format.count("{target_language}") == 1
        assert self.prompt_format.count("{text}") == 1


@dataclass(kw_only=True)
class TranslateInput:
    source_language: str
    target_language: str
    text: str


@dataclass(kw_only=True)
class RateJob(Job):
    source: str
    translation: str


@dataclass(kw_only=True)
class CompareJob(Job):
    source: str
    translation0: str
    translation1: str


Translation: TypeAlias = str
Rating: TypeAlias = float


@dataclass(kw_only=True)
class Comparison:
    probabilities: tuple[float, float]
    choice: int


TranslateJobResultOk: TypeAlias = JobResultOk[Translation]
RateJobResultOk: TypeAlias = JobResultOk[Rating]
CompareJobResultOk: TypeAlias = JobResultOk[Comparison]

TranslateAPIRequest = APIRequest[TranslateJob]
TranslateAPIResponse = APIResponse[TranslateJobResultOk]
RateAPIRequest = APIRequest[RateJob]
RateAPIResponse = APIResponse[RateJobResultOk]
CompareAPIRequest = APIRequest[CompareJob]
CompareAPIResponse = APIResponse[CompareJobResultOk]

__all__ = [
    "JobResultOk",
    "TranslateJob",
    "PromptSetting",
    "TranslateInput",
    "RateJob",
    "CompareJob",
    "Translation",
    "Rating",
    "Comparison",
    "TranslateJobResultOk",
    "RateJobResultOk",
    "CompareJobResultOk",
    "TranslateAPIRequest",
    "TranslateAPIResponse",
    "RateAPIRequest",
    "RateAPIResponse",
    "CompareAPIRequest",
    "CompareAPIResponse",
]
