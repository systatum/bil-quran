from fastapi import FastAPI
from contextlib import asynccontextmanager
from translation import TranslateJob, Prompt, PromptSetting, TranslationService
from rating import RateJob, RatingService
from dataclasses import dataclass
from service import JobResult, Job
import dataclasses
import uuid
import threading
from time import sleep
import settings

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
        else:
            raise AssertionError("Unknown job type: {}".format(type(job)))

        with self._lock:
            self._jobs[job.job_id] = job

    def collect(self):
        with self._lock:
            self._results.update({result.job.job_id: result for result in appstate.get().translation_service.retrieve_results()})
            self._results.update({result.job.job_id: result for result in appstate.get().rating_service.retrieve_results()})

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
            translation_service = TranslationService(),
            rating_service = RatingService(),
            job_board = JobBoard()
        )
    )
    appstate.get().translation_service.start()
    appstate.get().rating_service.start()
    yield
    appstate.get().rating_service.stop()
    appstate.get().translation_service.stop()

app = FastAPI(lifespan=lifespan)

@app.get("/models")
def get_models():
    return list(settings.TRANSLATION_MODELS.keys())

@dataclass(kw_only=True)
class TranslateAPIRequest:
    prompt: Prompt
    setting: PromptSetting = dataclasses.field(default_factory = lambda: PromptSetting())
    model: str

@app.post("/translate")
def translate(request: TranslateAPIRequest):
    job = TranslateJob(model=request.model, setting=request.setting, prompt=request.prompt)
    appstate.get().job_board.queue(job)

    result = appstate.get().job_board.get_result_blocking(job.job_id)
    return result

@dataclass(kw_only=True)
class RateAPIRequest:
    source: str
    translation: str

@app.post("/rate")
def rate(request: RateAPIRequest):
    job = RateJob(source=request.source, translation=request.translation)
    appstate.get().job_board.queue(job)

    result = appstate.get().job_board.get_result_blocking(job.job_id)
    return result