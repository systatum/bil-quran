from src.service import JobResult
from typing import TypeAlias
from dataclasses import dataclass
import dataclasses

@dataclass(kw_only=True)
class PromptSetting:
    system_prompt: str = "You are an assistant who translates. The first line of the input is source and target language specification"
    response_format: dict = dataclasses.field(default_factory=
        lambda:
        {
            "type": "text",
        }
    )
    prompt_format: str = "{source_language} -> {target_language}\n{text}"

    def __post__init__(self):
        assert self.prompt_format.count("{source_language}") == 1
        assert self.prompt_format.count("{target_language}") == 1
        assert self.prompt_format.count("{text}") == 1
@dataclass(kw_only=True)
class TranslateInput:
    source_language: str
    target_language: str
    text: str
@dataclass(kw_only=True)
class TranslateAPIRequest:
    translate_input: TranslateInput
    setting: PromptSetting = dataclasses.field(default_factory = lambda: PromptSetting())
    model: str
Translation: TypeAlias = str
TranslateJobResult: TypeAlias = JobResult[Translation]

@dataclass(kw_only=True)
class RateAPIRequest:
    source: str
    translation: str
Rating: TypeAlias = float
RateJobResult: TypeAlias = JobResult[Rating]

@dataclass(kw_only=True)
class CompareAPIRequest:
    source: str
    translation0: str
    translation1: str
@dataclass(kw_only=True)
class Comparison:
    probabilities: tuple[float, float]
    choice: int
CompareJobResult: TypeAlias = JobResult[Comparison]