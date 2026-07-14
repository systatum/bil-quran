from fastapi import FastAPI
from time import sleep
from queue import Queue
import queue
from dataclasses import dataclass
import dataclasses
from translator import Prompt, PromptSetting, Model
from model_loader import load_models
import threading
import traceback
import uuid

@dataclass(kw_only=True)
class TranslationJob:
    job_id: uuid.UUID = dataclasses.field(default_factory = lambda: uuid.uuid4())
    prompt: Prompt
    setting: PromptSetting
    model: str

    def ok(self, result: str) -> TranslationResult:
        return TranslationResult(job=self, status="ok", result=result, error_message=None)
    
    def err(self, result: str) -> TranslationResult:
        return TranslationResult(job=self, status="err", result=result, error_message=None)

@dataclass(kw_only=True)
class TranslationResult:
    job: TranslationJob
    status: str
    result: str | None
    error_message: str | None
    
    def is_ok(self) -> bool:
        return self.status == "ok"

class TranslationService:
    _models: dict[str, Model]
    _job_queue: Queue[TranslationJob]
    _result_queue: Queue[TranslationResult]
    @dataclass(kw_only=True)
    class Shared:
        thread: threading.Thread
        is_shutdown_requested: bool
        lock: threading.Lock
    _shared_resource: Shared

    def __init__(self, job_queue: Queue[TranslationJob], result_queue: Queue[TranslationResult]):
        self._models = load_models()
        self._job_queue = job_queue
        self._result_queue: Queue[TranslationResult] = result_queue
        self._shared_resource = self.Shared(
            thread = threading.Thread(target=self._loop),
            is_shutdown_requested = False,
            lock = threading.Lock()
        )

        with self._shared_resource.lock:
            self._shared_resource.thread.start()

    def stop(self):
        with self._shared_resource.lock:
            self._shared_resource.is_shutdown_requested = True

    def _loop(self):
        while True:
            sleep(0.1)
            with self._shared_resource.lock:
                if self._shared_resource.is_shutdown_requested:
                    return
                
            try:
                job = self._job_queue.get_nowait()
            except queue.Empty:
                continue
            self._result_queue.put(self._run_job(job))
            

    def _run_job(self, job: TranslationJob) -> TranslationResult:
        try:
            model = self._models[job.model]
        except KeyError:
            return job.err(f"Model {job.model} not available")
        
        try:
            result = model.prompt(setting=job.setting, prompt_object=job.prompt)
            if result is None:
                return job.err("Query returned an empty response")
        except Exception as e:
            return job.err(f"Unexpected error {type(e).__name__}: {traceback.format_exc()}")
        
        return job.ok(result)

job_queue = Queue()
result_queue = Queue()
translation_service = TranslationService(job_queue=job_queue, result_queue=result_queue)
app = FastAPI()

@app.get("/test")
def test():
    job = TranslationJob(model="qwen2.5-1.5b", setting=PromptSetting(), prompt=Prompt(text="Who's that over there?"))
    job_queue.put(job)

    result = result_queue.get()
    return result.result if result.is_ok() else "Error: " + result.error_message

@app.get("/st")
def shutdown():
    translation_service.stop()