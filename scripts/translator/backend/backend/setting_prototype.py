from __future__ import annotations
from dataclasses import dataclass


@dataclass(kw_only=True, frozen=True)
class Setting:
    APP_TOKEN: str
    VLLM_PORT: int
    VLLM_MODELS: dict[str, ModelSetting]  # Key is alias


@dataclass(kw_only=True, frozen=True)
class ModelSetting:
    hugging_face_id: str
    vllm_serve_arguments: dict[str, str]  # Should not include port argument
