from backend.llm_model_source import ModelSource
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Setting:
    LLM_TEMP_DIR: Path
    LLM_MODEL_DIR: Path

    # Dict key will be the internal model name, and will be stored as {name}.gguf
    LLM_MODELS: dict[str, ModelSource]

    LLM_GPU_ENABLED: bool
    LLM_CONTEXT_SIZE: int

    APP_TOKEN: str
