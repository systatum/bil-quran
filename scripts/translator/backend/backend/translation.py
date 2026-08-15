from __future__ import annotations
from backend.llm_model_loader import load_models
from backend.llm_model import LLMModel
from backend.service import Job, JobResult, Service
from typing import TypeAlias
import traceback

# Re-export
from shared.api.internal import TranslateJob, Translation

TranslateJobResult: TypeAlias = JobResult[Translation, str]


class TranslationService(Service[Translation, str]):
    _models: dict[str, LLMModel]

    def __init__(self):
        super().__init__()
        self._models = load_models()

    def _run_job(self, job: Job[Translation, str]) -> JobResult[Translation, str]:
        assert isinstance(job, TranslateJob)

        try:
            model = self._models[job.model]
        except KeyError:
            return JobResult.err(job, f"Model {job.model} is not available")

        try:
            answer = model.prompt(
                setting=job.setting, translate_input=job.translate_input
            )
            if answer is None:
                return JobResult.err(job, "Query returned an empty response")
        except Exception as e:
            return JobResult.err(
                job, f"Unexpected error {type(e).__name__}: {traceback.format_exc()}"
            )

        return JobResult.ok(job, answer)
