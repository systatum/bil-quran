from __future__ import annotations
from backend.src.setting_loader import SettingLoader
from dataclasses import dataclass
from typing import Optional, List, Union, Dict, Iterator
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
            n_gpu_layers=-1 if SettingLoader.get().LLM_GPU_ENABLED else 0,
            n_ctx=SettingLoader.get().LLM_CONTEXT_SIZE,
        )

    def create_chat_completion(
        self,
        messages: List[llama_cpp.ChatCompletionRequestMessage],
        functions: Optional[List[llama_cpp.ChatCompletionFunction]] = None,
        function_call: Optional[llama_cpp.ChatCompletionRequestFunctionCall] = None,
        tools: Optional[List[llama_cpp.ChatCompletionTool]] = None,
        tool_choice: Optional[llama_cpp.ChatCompletionToolChoiceOption] = None,
        temperature: float = 0.2,
        top_p: float = 0.95,
        top_k: int = 40,
        min_p: float = 0.05,
        typical_p: float = 1.0,
        stream: bool = False,
        stop: Optional[Union[str, List[str]]] = [],
        seed: Optional[int] = None,
        response_format: Optional[llama_cpp.ChatCompletionRequestResponseFormat] = None,
        max_tokens: Optional[int] = None,
        presence_penalty: float = 0.0,
        frequency_penalty: float = 0.0,
        repeat_penalty: float = 1.0,
        tfs_z: float = 1.0,
        mirostat_mode: int = 0,
        mirostat_tau: float = 5.0,
        mirostat_eta: float = 0.1,
        model: Optional[str] = None,
        logits_processor: Optional[llama_cpp.LogitsProcessorList] = None,
        grammar: Optional[llama_cpp.LlamaGrammar] = None,
        logit_bias: Optional[Dict[int, float]] = None,
        logprobs: Optional[bool] = None,
        top_logprobs: Optional[int] = None,
        **kwargs,  # This is all we actually need
    ) -> Union[
        llama_cpp.CreateChatCompletionResponse,
        Iterator[llama_cpp.CreateChatCompletionStreamResponse],
    ]:
        "https://github.com/abetlen/llama-cpp-python/issues/2063#issuecomment-4358133581"
        handler = (
            self._model.chat_handler
            or self._model._chat_handlers.get(typing.cast(str, self._model.chat_format))
            or llama_cpp.llama_chat_format.get_chat_completion_handler(
                typing.cast(str, self._model.chat_format)
            )
        )
        return handler(
            llama=self._model,
            messages=messages,
            functions=functions,
            function_call=function_call,
            tools=tools,
            tool_choice=tool_choice,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k,
            min_p=min_p,
            typical_p=typical_p,
            logprobs=logprobs,
            top_logprobs=top_logprobs,
            stream=stream,
            stop=stop,
            seed=seed,
            response_format=response_format,
            max_tokens=max_tokens,
            presence_penalty=presence_penalty,
            frequency_penalty=frequency_penalty,
            repeat_penalty=repeat_penalty,
            tfs_z=tfs_z,
            mirostat_mode=mirostat_mode,
            mirostat_tau=mirostat_tau,
            mirostat_eta=mirostat_eta,
            model=model,
            logits_processor=logits_processor,
            grammar=grammar,
            logit_bias=typing.cast(Dict[str, float] | None, logit_bias),
            **kwargs,
        )

    def prompt(
        self, setting: PromptSetting, translate_input: TranslateInput
    ) -> str | None:
        result: llama_cpp.CreateChatCompletionResponse = typing.cast(
            llama_cpp.CreateChatCompletionResponse,
            self.create_chat_completion(
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
                enable_thinking=False,
            ),
        )

        return result["choices"][0]["message"]["content"]
