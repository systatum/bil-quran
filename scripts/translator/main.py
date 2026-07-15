from fastapi import FastAPI
from contextlib import asynccontextmanager
from translation import TranslationJob, Prompt, PromptSetting, TranslationService, TranslationResult
from dataclasses import dataclass
import dataclasses
import uuid
import threading
from time import sleep
import settings

translation_service: TranslationService = TranslationService()
finished_jobs: dict[uuid.UUID, TranslationResult] = {}
finished_jobs_lock: threading.Lock = threading.Lock()

@asynccontextmanager
async def lifespan(_: FastAPI):
    translation_service.start()
    yield
    translation_service.stop()

app = FastAPI(lifespan=lifespan)

def collect_results():
    with finished_jobs_lock:
        finished_jobs.update({result.job.job_id: result for result in translation_service.retrieve_results()})

def get_result(job_id: uuid.UUID) -> TranslationResult | None:
    collect_results()
    with finished_jobs_lock:
        return finished_jobs.get(job_id)
    
def get_result_blocking(job_id: uuid.UUID) -> TranslationResult:
    while (result := get_result(job_id)) is None:
        sleep(0.5)
    return result

@app.get("/test")
def test():
    job = TranslationJob(model="qwen2.5-1.5b", setting=PromptSetting(), prompt=Prompt(text="Who's that over there?", source_language="English", target_language="Indonesian"))
    translation_service.queue_job(job)

    result = get_result_blocking(job.job_id)
    return result

@app.get("/models")
def get_models():
    return list(settings.AVAILABLE_MODELS.keys())

@dataclass(kw_only=True)
class TranslateAPIRequest:
    prompt: Prompt
    setting: PromptSetting = dataclasses.field(default_factory = lambda: PromptSetting())
    model: str

@app.post("/translate")
def translate(request: TranslateAPIRequest):
    job = TranslationJob(model=request.model, setting=request.setting, prompt=request.prompt)
    translation_service.queue_job(job)

    result = get_result_blocking(job.job_id)
    return result