from __future__ import annotations
from dataclasses import dataclass
from model import Prompt, PromptSetting, Model
from model_loader import load_models
from service import Job, JobResult, Service
import traceback
from typing import TypeAlias

Translation: TypeAlias = str

@dataclass(kw_only=True)
class TranslationJob(Job[Translation]):
    prompt: Prompt
    setting: PromptSetting
    model: str

TranslationJobResult: TypeAlias = JobResult[Translation]

class TranslationService(Service[Translation]):
    _models: dict[str, Model]

    def __init__(self):
        super().__init__()
        self._models = load_models()

    def _run_job(self, job: Job[Translation]) -> JobResult[Translation]:
        assert isinstance(job, TranslationJob)

        try:
            model = self._models[job.model]
        except KeyError:
            return job.err(f"Model {job.model} is not available")

        try:
            answer = model.prompt(setting=job.setting, prompt_object=job.prompt)
            if answer is None:
                return job.err("Query returned an empty response")
        except Exception as e:
            return job.err(f"Unexpected error {type(e).__name__}: {traceback.format_exc()}")

        return job.ok(answer)