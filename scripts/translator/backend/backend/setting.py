from shared.env import BackendEnv as Env
from backend.setting_prototype import Setting, ModelSetting


def get_setting() -> Setting:
    return Setting(
        VLLM_PORT=3000,
        VLLM_MODELS={
            "qwen3-0.6b": ModelSetting(
                hugging_face_id="Qwen/Qwen3-0.6B",
                vllm_serve_arguments={},
            ),
            "smollm2-360m": ModelSetting(
                hugging_face_id="HuggingFaceTB/SmolLM2-360M-Instruct",
                vllm_serve_arguments={},
            ),
        },
        APP_TOKEN=Env.get().API_KEY,
    )
