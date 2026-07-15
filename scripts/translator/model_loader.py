import os
import shutil
import huggingface_hub
from pathlib import Path
from settings import MODEL_DIR, AVAILABLE_MODELS, TEMP_DIR
from model_source import ModelSource
from model import Model

def download_model_to_path(source: ModelSource, path: Path):
    os.makedirs(TEMP_DIR, exist_ok=True)
    huggingface_hub.hf_hub_download(repo_id=source.get_repo_id(), filename=source.filename, local_dir=TEMP_DIR)
    shutil.move(TEMP_DIR / source.filename, path)

def load_models() -> dict[str, Model]:
    os.makedirs(MODEL_DIR, exist_ok=True)

    models = {}

    for name, model_source in AVAILABLE_MODELS.items():
        name_with_extension = name + ".gguf"

        if not (MODEL_DIR / name_with_extension).is_file():
            download_model_to_path(model_source, MODEL_DIR / name_with_extension)

        models[name] = Model(str(MODEL_DIR / name_with_extension))

    return models