from backend.translation import TranslateJob, TranslateJobResult, TranslationService
from backend.rating import RateJob, RateJobResult, RatingService
from backend.comparison import CompareJob, CompareJobResult, ComparisonService
from backend.service import JobResult, Job
from backend.setting_loader import SettingLoader
from shared.api import (
    ModelsAPIResponse,
    HealthResult,
    HealthAPIResponse,
    APIError,
    APIResponse,
)
from shared.api.internal import (
    JobResultOk,
    TranslateAPIRequest,
    TranslateAPIResponse,
    RateAPIRequest,
    RateAPIResponse,
    CompareAPIRequest,
    CompareAPIResponse,
)
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
from dataclasses import dataclass
from time import sleep
from datetime import datetime, timezone
from typing import TypeVar, Annotated
import uuid
import threading
import typing
import sys
import torch
import subprocess


class JobBoard:
    _jobs: dict[uuid.UUID, Job]
    _results: dict[uuid.UUID, JobResult]
    _last_activity_timestamp: datetime
    _lock: threading.Lock

    def __init__(self):
        self._jobs = {}
        self._results = {}
        self._last_activity_timestamp = datetime.now(timezone.utc)
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
            self._last_activity_timestamp = datetime.now(timezone.utc)

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
            self._last_activity_timestamp = datetime.now(timezone.utc)

    def get_result(self, job_id: uuid.UUID) -> JobResult | None:
        self.collect()
        with self._lock:
            return self._results.get(job_id)

    def get_result_blocking(self, job_id: uuid.UUID) -> JobResult:
        while (result := self.get_result(job_id)) is None:
            sleep(0.5)
        return result

    def get_last_activity_timestamp(self) -> datetime:
        with self._lock:
            return self._last_activity_timestamp


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


def print_version():
    print("Python version:", sys.version)
    print("Torch version:", torch.__version__)
    print("Torch CUDA version:", torch.version.cuda)
    print("CUDA available:", torch.cuda.is_available())
    if torch.cuda.is_available():
        print("GPU name:", torch.cuda.get_device_name(0))
        major, minor = torch.cuda.get_device_capability(0)
        print(f"Compute Capability: {major}.{minor} (sm_{major}{minor})")
        print("Supported SMs:", ", ".join(torch.cuda.get_arch_list()))

        try:
            driver = (
                subprocess.check_output(
                    [
                        "nvidia-smi",
                        "--query-gpu=driver_version",
                        "--format=csv,noheader",
                    ],
                    text=True,
                )
                .strip()
                .splitlines()[0]
            )
            print("Driver version:", driver)
        except Exception as e:
            print("Driver version unknown, {}\n{}".format(type(e).__name__, e))


appstate: Appstate = Appstate()


@asynccontextmanager
async def lifespan(_: FastAPI):
    print_version()
    SettingLoader.get()  # Initialize setting here so we can see what's going on
    print(end="", flush=True)
    print(end="", flush=True, file=sys.stderr)

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
    print_version()
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


def check_token(
    authorization: Annotated[HTTPAuthorizationCredentials, Depends(HTTPBearer())],
):
    if authorization.credentials != SettingLoader.get().APP_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API token",
            headers={"WWW-Authenticate": "Bearer"},
        )


@app.get("/health")
def get_health(_: Annotated[None, Depends(check_token)]) -> HealthAPIResponse:
    app = appstate.get()
    job_board_timestamp: datetime = app.job_board.get_last_activity_timestamp()
    busy: bool = any(
        service.is_busy()
        for service in (
            app.translation_service,
            app.rating_service,
            app.comparison_service,
        )
    )
    last_activity_timestamp: datetime = (
        datetime.now(timezone.utc) if busy else job_board_timestamp
    )
    return HealthAPIResponse.ok(
        HealthResult(healthy=True, last_activity_timestamp=last_activity_timestamp)
    )


@app.get("/models")
def get_models(_: Annotated[None, Depends(check_token)]) -> ModelsAPIResponse:
    return ModelsAPIResponse.ok(list(SettingLoader.get().LLM_MODELS.keys()))


@app.post("/translate")
def translate(
    request: TranslateAPIRequest, _: Annotated[None, Depends(check_token)]
) -> TranslateAPIResponse:
    job = request.root
    appstate.get().job_board.queue(job)

    result: TranslateJobResult = appstate.get().job_board.get_result_blocking(
        job.job_id
    )
    return job_result_to_api_response(result)


@app.post("/rate")
def rate(
    request: RateAPIRequest, _: Annotated[None, Depends(check_token)]
) -> RateAPIResponse:
    job = request.root
    appstate.get().job_board.queue(job)

    result: RateJobResult = appstate.get().job_board.get_result_blocking(job.job_id)
    return job_result_to_api_response(result)


@app.post("/compare")
def compare(
    request: CompareAPIRequest, _: Annotated[None, Depends(check_token)]
) -> CompareAPIResponse:
    job = request.root
    appstate.get().job_board.queue(job)

    result: CompareJobResult = appstate.get().job_board.get_result_blocking(job.job_id)
    return job_result_to_api_response(result)
