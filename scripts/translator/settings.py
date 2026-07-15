from model_source import ModelSource
from pathlib import Path

TEMP_DIR = Path("/tmp/hg_download")
MODEL_DIR = Path("./models")

# Dict key will be the internal model name, and will be stored as {name}.gguf
AVAILABLE_MODELS = {
    "qwen2.5-1.5b": ModelSource(hf_repo_url="https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF", filename="qwen2.5-1.5b-instruct-q5_k_m.gguf"),
    "smollm2-1.7b": ModelSource(hf_repo_url="https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF", filename="smollm2-1.7b-instruct-q4_k_m.gguf")
}