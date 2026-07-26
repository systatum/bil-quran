from __future__ import annotations
from src.llm_model import TranslateInput, PromptSetting, LLMModel
from src.llm_model_loader import load_models
from src.service import Job, JobResult, Service
from src.shared import Translation
from dataclasses import dataclass
import traceback

@dataclass(kw_only=True)
class TranslateJob(Job[Translation]):
    prompt: TranslateInput
    setting: PromptSetting
    model: str

class TranslationService(Service[Translation]):
    _models: dict[str, LLMModel]

    def __init__(self):
        super().__init__()
        self._models = load_models()

    def _run_job(self, job: Job[Translation]) -> JobResult[Translation]:
        assert isinstance(job, TranslateJob)

        try:
            model = self._models[job.model]
        except KeyError:
            return job.err(f"Model {job.model} is not available")

        try:
            answer = model.prompt(setting=job.setting, translate_input=job.prompt)
            if answer is None:
                return job.err("Query returned an empty response")
        except Exception as e:
            return job.err(f"Unexpected error {type(e).__name__}: {traceback.format_exc()}")

        return job.ok(answer)