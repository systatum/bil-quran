from src.settings import LLM_MODEL_DIR, LLM_MODELS, LLM_TEMP_DIR
from src.llm_model_source import ModelSource
from src.llm_model import LLMModel
from pathlib import Path
import os
import shutil
import huggingface_hub


def download_model_to_path(source: ModelSource, path: Path):
    os.makedirs(LLM_TEMP_DIR, exist_ok=True)
    huggingface_hub.hf_hub_download(
        repo_id=source.get_repo_id(), filename=source.filename, local_dir=LLM_TEMP_DIR
    )
    shutil.move(LLM_TEMP_DIR / source.filename, path)


def load_models() -> dict[str, LLMModel]:
    os.makedirs(LLM_MODEL_DIR, exist_ok=True)

    models = {}

    for name, model_source in LLM_MODELS.items():
        name_with_extension = name + ".gguf"

        if not (LLM_MODEL_DIR / name_with_extension).is_file():
            download_model_to_path(model_source, LLM_MODEL_DIR / name_with_extension)

        models[name] = LLMModel(str(LLM_MODEL_DIR / name_with_extension))

    return models
