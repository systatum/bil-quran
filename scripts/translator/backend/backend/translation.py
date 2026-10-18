from __future__ import annotations
from backend.service import Job, JobResult, Service
from backend.setting import ModelSetting
from backend.setting_loader import SettingLoader
from typing import TypeAlias, Optional
from huggingface_hub import snapshot_download
from itertools import chain
from dataclasses import dataclass
from time import sleep
import subprocess
import traceback
import httpx

# Re-export
from shared.api.internal import TranslateJob, Translation

TranslateJobResult: TypeAlias = JobResult[Translation, str]


@dataclass
class LoadedModel:
    alias: str
    model_setting: ModelSetting
    instance: subprocess.Popen


class TranslationService(Service[Translation, str]):
    _loaded_model: Optional[LoadedModel]

    def __init__(self):
        super().__init__()
        download_models()

        self._loaded_model = None

    def is_healthy(self) -> bool:
        if not super().is_healthy():
            return False

        try:
            response: httpx.Response = httpx.get(
                f"http://localhost:{SettingLoader.get().VLLM_PORT}/health"
            )
            return response.status_code == 200
        except httpx.RequestError:
            return False

    def _run_job(self, job: Job[Translation, str]) -> JobResult[Translation, str]:
        if not isinstance(job, TranslateJob):
            return JobResult.err(job, "Job is not of instance TranslationJob")

        _model_setting: Optional[ModelSetting] = SettingLoader.get().VLLM_MODELS.get(
            job.model
        )
        if _model_setting is None:
            return JobResult.err(job, f"Model {job.model} is not available")
        model_setting: ModelSetting = _model_setting

        try:
            if self._loaded_model is not None and job.model != self._loaded_model.alias:
                print(f"Unloading model {job.model}")
                self._loaded_model.instance.terminate()
                self._loaded_model.instance.wait()
                self._loaded_model = None
                print(f"Finished unloading model {job.model}")

            if self._loaded_model is None:
                print(f"Loading model {job.model}")
                instance: subprocess.Popen = self._vllm_start(model_setting)
                self._loaded_model = LoadedModel(
                    instance=instance, alias=job.model, model_setting=model_setting
                )
                print(f"Finished loading model {job.model}")

            return self._send_job_to_vllm(job, model_setting.hugging_face_id)

        except Exception as e:
            error_message: str = (
                f"Unexpected error {type(e).__name__}: {traceback.format_exc()}"
            )
            print(error_message)
            return JobResult.err(job, error_message)

    def _vllm_start(self, model_setting: ModelSetting) -> subprocess.Popen:
        process = subprocess.Popen(
            [
                "vllm",
                "serve",
                model_setting.hugging_face_id,
                "--port",
                str(SettingLoader.get().VLLM_PORT),
                *chain.from_iterable(
                    (arg_name, arg_value)
                    for arg_name, arg_value in model_setting.vllm_serve_arguments.items()
                ),
            ]
        )
        while True:
            sleep(0.1)
            if self.is_healthy():
                return process

    def _send_job_to_vllm(
        self, job: TranslateJob, model_id: str
    ) -> JobResult[Translation, str]:
        messages: list[dict[str, str]] = [
            {
                "role": "system",
                "content": job.setting.system_prompt,
            },
            {
                "role": "user",
                "content": job.setting.prompt_format.format(
                    source_language=job.translate_input.source_language,
                    target_language=job.translate_input.target_language,
                    text=job.translate_input.text,
                ),
            },
        ]
        request: dict = {"model": model_id, "messages": messages}
        response = httpx.post(
            f"http://localhost:{SettingLoader.get().VLLM_PORT}/v1/chat/completions",
            json=request,
        )
        response.raise_for_status()
        return JobResult.ok(job, response.json()["choices"][0]["message"]["content"])


def download_models():
    for model_setting in SettingLoader.get().VLLM_MODELS.values():
        snapshot_download(model_setting.hugging_face_id)
