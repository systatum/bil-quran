from __future__ import annotations
from backend.llm_model_loader import load_models, load_model
from backend.llm_model import LLMModel
from backend.service import Job, JobResult, Service
from backend.setting_loader import SettingLoader
from typing import TypeAlias
from collections import deque
import traceback

# Re-export
from shared.api.internal import TranslateJob, Translation

TranslateJobResult: TypeAlias = JobResult[Translation, str]


class TranslationService(Service[Translation, str]):
    _models: dict[str, LLMModel]
    _model_queue: deque[str]

    def __init__(self):
        super().__init__()
        queue_max: int = SettingLoader.get().LLM_MAX_LOADED
        # MAX_LOADED 0 is a special case
        queue_max = queue_max if queue_max > 0 else 1
        if len(SettingLoader.get().LLM_MODELS) <= queue_max:
            self._models = load_models()
            self._model_queue = deque(self._models.keys(), maxlen=queue_max)
        else:
            self._models = {}
            self._model_queue = deque(maxlen=queue_max)

    def _run_job(self, job: Job[Translation, str]) -> JobResult[Translation, str]:
        assert isinstance(job, TranslateJob)

        if job.model not in SettingLoader.get().LLM_MODELS.keys():
            return JobResult.err(job, f"Model {job.model} is not available")

        assert len(self._models) == len(self._model_queue)
        if job.model not in self._model_queue:
            if len(self._model_queue) == self._model_queue.maxlen:
                popped_model_name = self._model_queue.pop()
                self._models.pop(popped_model_name)

            self._model_queue.append(job.model)
            self._models[job.model] = load_model(job.model)

        model: LLMModel = self._models[job.model]

        answer: str | None
        try:
            answer = model.prompt(
                setting=job.setting, translate_input=job.translate_input
            )
        except Exception as e:
            return JobResult.err(
                job, f"Unexpected error {type(e).__name__}: {traceback.format_exc()}"
            )
        finally:
            # If MAX_LOADED is 0, we want to unload as soon as no job is left to do
            if SettingLoader.get().LLM_MAX_LOADED == 0:
                assert self._model_queue.maxlen == 1
                if self._job_queue.qsize() == 0:
                    self._model_queue.pop()
                    self._models = {}

        if answer is None:
            return JobResult.err(job, "Query returned an empty response")
        return JobResult.ok(job, answer)
