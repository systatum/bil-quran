from __future__ import annotations
from settings import MODEL_DIR
from comet import load_from_checkpoint
from huggingface_hub import snapshot_download
from time import sleep
from queue import Queue
import queue
from dataclasses import dataclass
import dataclasses
import threading
import traceback
import uuid

def download_model():
    snapshot_download("Unbabel/wmt20-comet-qe-da", local_dir=MODEL_DIR / "comet-qe-da")

def load_model():
    return load_from_checkpoint(str(MODEL_DIR / "comet-qe-da" / "checkpoints" / "model.ckpt"))

def rate(model, source: str, translation: str) -> float:
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
class RateJob:
    job_id: uuid.UUID = dataclasses.field(default_factory = lambda: uuid.uuid4())
    source: str
    translation: str

    def ok(self, result: float) -> RateResult:
        return RateResult(job=self, status="ok", result=result, error_message=None)

    def err(self, error_message: str) -> RateResult:
        return RateResult(job=self, status="err", result=None, error_message=error_message)

@dataclass(kw_only=True)
class RateResult:
    job: RateJob
    status: str
    result: float | None
    error_message: str | None

    def is_ok(self) -> bool:
        return self.status == "ok"

class RatingService:
    _job_queue: Queue[RateJob]
    _result_queue: Queue[RateResult]
    @dataclass(kw_only=True)
    class Shared:
        thread: threading.Thread
        is_shutdown_requested: bool
        lock: threading.Lock
    _shared_resource: Shared

    def __init__(self):
        download_model()
        self._model = load_model()
        self._job_queue = Queue()
        self._result_queue = Queue()
        self._shared_resource = self.Shared(
            thread = threading.Thread(target=self._loop),
            is_shutdown_requested = False,
            lock = threading.Lock()
        )

    def start(self):
        with self._shared_resource.lock:
            if self._shared_resource.is_shutdown_requested:
                return
            try:
                self._shared_resource.thread.start()
            except RuntimeError:
                return

    def stop(self):
        with self._shared_resource.lock:
            self._shared_resource.is_shutdown_requested = True

    def queue_job(self, job: RateJob):
        self._job_queue.put(job)

    def retrieve_results(self, max_amount: int = 100) -> list[RateResult]:
        result = []
        for _ in range(max_amount):
            try:
                result.append(self._result_queue.get_nowait())
            except queue.Empty:
                break
        return result

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

    def _run_job(self, job: RateJob) -> RateResult:
        try:
            result = rate(self._model, job.source, job.translation)
        except Exception as e:
            return job.err(f"Unexpected error {type(e).__name__}: {traceback.format_exc()}")

        return job.ok(result)