from src.shared import PromptSetting, TranslateInput
from src.settings import LLM_GPU_ENABLED
import typing
import llama_cpp

class LLMModel:
    def __init__(self, model_path: str):
        self._model = llama_cpp.Llama(model_path=model_path, n_gpu_layers=-1 if LLM_GPU_ENABLED else 0, n_ctx=4096)

    def prompt(self, setting: PromptSetting, translate_input: TranslateInput) -> str | None:
        result: llama_cpp.CreateChatCompletionResponse = typing.cast(llama_cpp.CreateChatCompletionResponse,
            self._model.create_chat_completion(
                messages = [
                    {"role": "system", "content": setting.system_prompt},
                    {"role": "user", "content":
                        setting.prompt_format.format(
                            source_language = translate_input.source_language,
                            target_language = translate_input.target_language,
                            text = translate_input.text,
                        ),
                    },
                ],
                response_format = typing.cast(llama_cpp.ChatCompletionRequestResponseFormat, setting.response_format),
            )
        )

        return result["choices"][0]["message"]["content"]