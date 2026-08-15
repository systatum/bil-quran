from src.setting_prototype import get_env, Setting
from src.llm_model_source import ModelSource
from pathlib import Path


def get_setting() -> Setting:
    MOUNT_ROOT: str = get_env("MOUNT_ROOT")
    APP_TOKEN: str = get_env("APP_TOKEN")

    return Setting(
        LLM_TEMP_DIR=Path("/tmp/hg_download"),
        LLM_MODEL_DIR=Path(MOUNT_ROOT) / "models",
        LLM_MODELS={
            "qwen2.5-1.5b": ModelSource(
                hf_repo_url="https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF",
                filename="qwen2.5-1.5b-instruct-q5_k_m.gguf",
            ),
            "smollm2-1.7b": ModelSource(
                hf_repo_url="https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF",
                filename="smollm2-1.7b-instruct-q4_k_m.gguf",
            ),
        },
        LLM_GPU_ENABLED=False,
        LLM_CONTEXT_SIZE=1024,
        APP_TOKEN=APP_TOKEN,
    )
