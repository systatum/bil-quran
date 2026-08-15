from __future__ import annotations
from backend.service import JobResult, Job, Service
from comet import download_model, load_from_checkpoint
from comet.models import CometModel
from typing import TypeAlias
import traceback

# Re-export
from shared.api.internal import RateJob, Rating

RateJobResult: TypeAlias = JobResult[Rating, str]


class RatingService(Service[Rating, str]):
    _model: CometModel

    def __init__(self):
        super().__init__()
        self._model = load_model()

    def _run_job(self, job: Job[Rating, str]) -> JobResult[Rating, str]:
        assert isinstance(job, RateJob)

        try:
            result = rate(self._model, job.source, job.translation)
        except Exception as e:
            return JobResult.err(
                job, f"Unexpected error {type(e).__name__}: {traceback.format_exc()}"
            )

        return JobResult.ok(job, result)


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
