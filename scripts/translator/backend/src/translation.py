from __future__ import annotations
from backend.src.llm_model_loader import load_models
from backend.src.llm_model import PromptSetting, TranslateInput, LLMModel
from backend.src.service import Job, JobResult, Service
from dataclasses import dataclass
from typing import TypeAlias
import traceback


@dataclass(kw_only=True)
class TranslateJob(Job):
    translate_input: TranslateInput
    setting: PromptSetting
    model: str


Translation: TypeAlias = str
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
            return job.err(f"Model {job.model} is not available")

        try:
            answer = model.prompt(
                setting=job.setting, translate_input=job.translate_input
            )
            if answer is None:
                return job.err("Query returned an empty response")
        except Exception as e:
            return job.err(
                f"Unexpected error {type(e).__name__}: {traceback.format_exc()}"
            )

        return job.ok(answer)
