from src.translation import TranslateJob, TranslateJobResult, TranslationService
from src.rating import RateJob, RateJobResult, RatingService
from src.comparison import CompareJob, CompareJobResult, ComparisonService
from src.service import JobResult, Job, JobResultOk
from src.settings import LLM_MODELS
from src.api import (
    ModelAPIResponse,
    TranslateAPIRequest,
    TranslateAPIResponse,
    RateAPIRequest,
    RateAPIResponse,
    CompareAPIRequest,
    CompareAPIResponse,
    APIError,
    APIResponse,
)
from fastapi import FastAPI
from contextlib import asynccontextmanager
from dataclasses import dataclass
from time import sleep
from typing import TypeVar
import uuid
import threading
import typing


class JobBoard:
    _jobs: dict[uuid.UUID, Job]
    _results: dict[uuid.UUID, JobResult]
    _lock: threading.Lock

    def __init__(self):
        self._jobs = {}
        self._results = {}
        self._lock = threading.Lock()

    def queue(self, job: Job):
        if isinstance(job, TranslateJob):
            appstate.get().translation_service.queue_job(job)
        elif isinstance(job, RateJob):
            appstate.get().rating_service.queue_job(job)
        elif isinstance(job, CompareJob):
            appstate.get().comparison_service.queue_job(job)
        else:
            raise AssertionError("Unknown job type: {}".format(type(job)))

        with self._lock:
            self._jobs[job.job_id] = job

    def collect(self):
        with self._lock:
            self._results.update(
                {
                    result.job.job_id: result
                    for result in appstate.get().translation_service.retrieve_results()
                }
            )
            self._results.update(
                {
                    result.job.job_id: result
                    for result in appstate.get().rating_service.retrieve_results()
                }
            )
            self._results.update(
                {
                    result.job.job_id: result
                    for result in appstate.get().comparison_service.retrieve_results()
                }
            )

    def get_result(self, job_id: uuid.UUID) -> JobResult | None:
        self.collect()
        with self._lock:
            return self._results.get(job_id)

    def get_result_blocking(self, job_id: uuid.UUID) -> JobResult:
        while (result := self.get_result(job_id)) is None:
            sleep(0.5)
        return result


@dataclass(kw_only=True)
class GlobalData:
    translation_service: TranslationService
    rating_service: RatingService
    comparison_service: ComparisonService
    job_board: JobBoard


@dataclass(kw_only=True)
class Appstate:
    global_data: GlobalData | None

    def __init__(self):
        self.global_data = None

    def load(self, global_data: GlobalData):
        self.global_data = global_data

    def get(self):
        assert self.global_data is not None
        return self.global_data


appstate: Appstate = Appstate()


@asynccontextmanager
async def lifespan(_: FastAPI):
    appstate.load(
        GlobalData(
            translation_service=TranslationService(),
            rating_service=RatingService(),
            comparison_service=ComparisonService(),
            job_board=JobBoard(),
        )
    )
    appstate.get().translation_service.start()
    appstate.get().rating_service.start()
    appstate.get().comparison_service.start()
    yield
    appstate.get().rating_service.stop()
    appstate.get().translation_service.stop()
    appstate.get().comparison_service.stop()


app = FastAPI(lifespan=lifespan)

V = TypeVar("V")
E = TypeVar("E")


def job_result_to_api_response(result: JobResult[V, E]) -> APIResponse[JobResultOk[V]]:
    if result.result.is_ok():
        return APIResponse.ok(
            value=JobResultOk(
                job=typing.cast(Job[V, None], result.job),
                value=result.result.get_value(),
            )
        )

    error: E = result.result.get_error()
    if not isinstance(error, str):
        raise ValueError("JobResult is assumed to have str error")
    return APIResponse.err(APIError(error_message=error))


@app.get("/models")
def get_models() -> ModelAPIResponse:
    return ModelAPIResponse.ok(list(LLM_MODELS.keys()))


@app.post("/translate")
def translate(request: TranslateAPIRequest) -> TranslateAPIResponse:
    job = request.root
    appstate.get().job_board.queue(job)

    result: TranslateJobResult = appstate.get().job_board.get_result_blocking(
        job.job_id
    )
    return job_result_to_api_response(result)


@app.post("/rate")
def rate(request: RateAPIRequest) -> RateAPIResponse:
    job = request.root
    appstate.get().job_board.queue(job)

    result: RateJobResult = appstate.get().job_board.get_result_blocking(job.job_id)
    return job_result_to_api_response(result)


@app.post("/compare")
def compare(request: CompareAPIRequest) -> CompareAPIResponse:
    job = request.root
    appstate.get().job_board.queue(job)

    result: CompareJobResult = appstate.get().job_board.get_result_blocking(job.job_id)
    return job_result_to_api_response(result)
