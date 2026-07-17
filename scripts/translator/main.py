from fastapi import FastAPI
from contextlib import asynccontextmanager
from translation import TranslationJob, Prompt, PromptSetting, TranslationService, TranslationJobResult
from rating import RateJob, RateJobResult, RatingService
from dataclasses import dataclass
import dataclasses
import uuid
import threading
from time import sleep
import settings

@dataclass(kw_only=True)
class GlobalData:
    translation_service: TranslationService
    rating_service: RatingService

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
finished_tl_jobs: dict[uuid.UUID, TranslationJobResult] = {}
finished_tl_jobs_lock: threading.Lock = threading.Lock()
finished_rate_jobs: dict[uuid.UUID, RateJobResult] = {}
finished_rate_jobs_lock: threading.Lock = threading.Lock()

@asynccontextmanager
async def lifespan(_: FastAPI):
    appstate.load(GlobalData(translation_service=TranslationService(), rating_service=RatingService()))
    appstate.get().translation_service.start()
    appstate.get().rating_service.start()
    yield
    appstate.get().rating_service.stop()
    appstate.get().translation_service.stop()

app = FastAPI(lifespan=lifespan)

def collect_tl_results():
    with finished_tl_jobs_lock:
        finished_tl_jobs.update({result.job.job_id: result for result in appstate.get().translation_service.retrieve_results()})

def get_tl_result(job_id: uuid.UUID) -> TranslationJobResult | None:
    collect_tl_results()
    with finished_tl_jobs_lock:
        return finished_tl_jobs.get(job_id)

def get_tl_result_blocking(job_id: uuid.UUID) -> TranslationJobResult:
    while (result := get_tl_result(job_id)) is None:
        sleep(0.5)
    return result

def collect_rate_results():
    with finished_rate_jobs_lock:
        finished_rate_jobs.update({result.job.job_id: result for result in appstate.get().rating_service.retrieve_results()})

def get_rate_result(job_id: uuid.UUID) -> RateJobResult | None:
    collect_rate_results()
    with finished_rate_jobs_lock:
        return finished_rate_jobs.get(job_id)

def get_rate_result_blocking(job_id: uuid.UUID) -> RateJobResult:
    while (result := get_rate_result(job_id)) is None:
        sleep(0.5)
    return result

@app.get("/test")
def test():
    job = TranslationJob(model="qwen2.5-1.5b", setting=PromptSetting(), prompt=Prompt(text="Who's that over there?", source_language="English", target_language="Indonesian"))
    appstate.get().translation_service.queue_job(job)

    result = get_tl_result_blocking(job.job_id)
    return result

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
    job = TranslationJob(model=request.model, setting=request.setting, prompt=request.prompt)
    appstate.get().translation_service.queue_job(job)

    result = get_tl_result_blocking(job.job_id)
    return result

@dataclass(kw_only=True)
class RateAPIRequest:
    source: str
    translation: str

@app.post("/rate")
def rate(request: RateAPIRequest):
    job = RateJob(source=request.source, translation=request.translation)
    appstate.get().rating_service.queue_job(job)

    result = get_rate_result_blocking(job.job_id)
    return result