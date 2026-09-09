from typing import Any
import vllm
import typing

GB: int = 1024**3


def main():
    llm = vllm.LLM(
        model="Qwen/Qwen2.5-1.5B-Instruct",
        kv_cache_memory_bytes=1 * GB,
        quantization="mxfp4",
    )
    sampling_params = llm.get_default_sampling_params()
    sampling_params.max_tokens = 1024
    conversation = [
        {"role": "system", "content": "You are a helpful assistant"},
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hello! How can I assist you today?"},
        {
            "role": "user",
            "content": "Write an essay about the importance of higher education.",
        },
    ]
    outputs = llm.chat(
        messages=typing.cast(Any, [conversation for _ in range(32)]),
        sampling_params=sampling_params,
    )
    print([output.outputs[0].text for output in outputs])
