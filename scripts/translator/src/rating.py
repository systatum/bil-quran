from __future__ import annotations
from src.service import JobResult, Job, Service
from src.shared import Rating
from comet import download_model, load_from_checkpoint
from comet.models import CometModel
from dataclasses import dataclass
import traceback

def load_model() -> CometModel:
    path = download_model("Unbabel/wmt20-comet-qe-da")
    return load_from_checkpoint(path)

def rate(model: CometModel, source: str, translation: str) -> float:
    data = [
        {
            "src": source,
            "mt": translation,
        }
    ]
    # Due to a bug with the model when multiprocessing spawn_method is set to "spawn" (the default of fastapi dev),
    # num_workers is set to 0 as a workaround
    return model.predict(data, num_workers=0)[0][0]

@dataclass(kw_only=True)
class RateJob(Job[Rating]):
    source: str
    translation: str

class RatingService(Service[Rating]):
    _model: CometModel

    def __init__(self):
        super().__init__()
        self._model = load_model()

    def _run_job(self, job: Job[Rating]) -> JobResult[Rating]:
        assert isinstance(job, RateJob)

        try:
            result = rate(self._model, job.source, job.translation)
        except Exception as e:
            return job.err(f"Unexpected error {type(e).__name__}: {traceback.format_exc()}")

        return job.ok(result)