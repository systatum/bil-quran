import typing
import llama_cpp
from dataclasses import dataclass
import dataclasses

@dataclass(kw_only=True)
class PromptSetting:
    system_prompt: str = "You are an assistant who translates. The first line of the input is source and target language specification"
    response_format: llama_cpp.ChatCompletionRequestResponseFormat = dataclasses.field(default_factory=
        lambda:
        {
            "type": "json_object",
            "schema": {
                "type": "object",
                "properties": {"content": {"type": "string"}, "certainty": {"type": "string"}},
                "required": ["content", "certainty"],
            },
        }
    )
    prompt_format: str = "{source_language} -> {target_language}\n{text}"

    def __post__init__(self):
        assert self.prompt_format.count("{source_language}") == 1
        assert self.prompt_format.count("{target_language}") == 1
        assert self.prompt_format.count("{text}") == 1

@dataclass(kw_only=True)
class Prompt:
    source_language: str
    target_language: str
    text: str


class Model:
    def __init__(self, model_path: str):
        self._model = llama_cpp.Llama(model_path=model_path)

    def prompt(self, setting: PromptSetting, prompt_object: Prompt) -> str | None:
        result: llama_cpp.CreateChatCompletionResponse = typing.cast(llama_cpp.CreateChatCompletionResponse,
            self._model.create_chat_completion(
                messages = [
                    {"role": "system", "content": setting.system_prompt},
                    {"role": "user", "content":
                        setting.prompt_format.format(
                            source_language = prompt_object.source_language,
                            target_language = prompt_object.target_language,
                            text = prompt_object.text,
                        ),
                    },
                ],
                response_format = setting.response_format,
            )
        )

        return result["choices"][0]["message"]["content"]