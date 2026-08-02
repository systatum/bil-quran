from __future__ import annotations
from src.settings import LLM_GPU_ENABLED, LLM_CONTEXT_SIZE
from dataclasses import dataclass
import dataclasses
import typing
import llama_cpp


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


class LLMModel:
    def __init__(self, model_path: str):
        self._model = llama_cpp.Llama(
            model_path=model_path,
            n_gpu_layers=-1 if LLM_GPU_ENABLED else 0,
            n_ctx=LLM_CONTEXT_SIZE,
        )

    def prompt(
        self, setting: PromptSetting, translate_input: TranslateInput
    ) -> str | None:
        result: llama_cpp.CreateChatCompletionResponse = typing.cast(
            llama_cpp.CreateChatCompletionResponse,
            self._model.create_chat_completion(
                messages=[
                    {"role": "system", "content": setting.system_prompt},
                    {
                        "role": "user",
                        "content": setting.prompt_format.format(
                            source_language=translate_input.source_language,
                            target_language=translate_input.target_language,
                            text=translate_input.text,
                        ),
                    },
                ],
                response_format=typing.cast(
                    llama_cpp.ChatCompletionRequestResponseFormat,
                    setting.response_format,
                ),
            ),
        )

        return result["choices"][0]["message"]["content"]
