from backend.setting_loader import SettingLoader
from backend.llm_model_source import ModelSource
from backend.llm_model import LLMModel
from pathlib import Path
import os
import shutil
import huggingface_hub


def download_model_to_path(source: ModelSource, path: Path):
    os.makedirs(SettingLoader.get().LLM_TEMP_DIR, exist_ok=True)
    huggingface_hub.hf_hub_download(
        repo_id=source.get_repo_id(),
        filename=source.filename,
        local_dir=SettingLoader.get().LLM_TEMP_DIR,
    )
    shutil.move(SettingLoader.get().LLM_TEMP_DIR / source.filename, path)


def download_models():
    os.makedirs(SettingLoader.get().LLM_MODEL_DIR, exist_ok=True)

    for name, model_source in SettingLoader.get().LLM_MODELS.items():
        name_with_extension = name + ".gguf"

        if not (SettingLoader.get().LLM_MODEL_DIR / name_with_extension).is_file():
            download_model_to_path(
                model_source, SettingLoader.get().LLM_MODEL_DIR / name_with_extension
            )


def load_model(name: str) -> LLMModel:
    name_with_extension = name + ".gguf"
    path = str(SettingLoader.get().LLM_MODEL_DIR / name_with_extension)
    return LLMModel(path)


def load_models() -> dict[str, LLMModel]:
    models = {}

    for name, _ in SettingLoader.get().LLM_MODELS.items():
        name_with_extension = name + ".gguf"

        models[name] = LLMModel(
            str(SettingLoader.get().LLM_MODEL_DIR / name_with_extension)
        )

    return models
