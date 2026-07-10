import urllib.request

from llama_cpp import Llama
from huggingface_hub import hf_hub_download
import os
import shutil

MODEL_SOURCES = {
    "qwen2.5-1.5b": ["https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF", "qwen2.5-1.5b-instruct-q5_k_m.gguf"]
}

def set_up_models():
    temp_dir = "/tmp/hg_download"
    model_dir = "/models"
    os.mkdir(temp_dir)
    models = {}

    for name, url in MODEL_SOURCES.items():
        if not os.path.isfile(f"{model_dir}/{name}"):
            hf_hub_download(repo_id=url[0].lstrip("https://huggingface.co/"), filename=url[1], local_dir=temp_dir)
            shutil.move(f"{temp_dir}/{url[1]}", f"{model_dir}/{name}")

        models[name] = Llama(f"{model_dir}/{name}")

    shutil.rmtree(temp_dir)

    return models

def main():
    for name, model in set_up_models().items():
        print(f"{name}: ", model("The quick brown fox jumps ", stop=["."])["choices"][0]["text"])


if __name__ == "__main__":
    main()
