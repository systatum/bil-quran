from __future__ import annotations
from time import sleep
from queue import Queue
import queue
from dataclasses import dataclass
import dataclasses
import uuid
import threading
from typing import Generic, TypeVar
from abc import abstractmethod, ABC

"""
I couldn't really get to make something like rust associated types
Some additional assumptions:
- Job is supposed to be subclassed
such that it provides the necessary context to work on the job.
- JobResult is not mixed with other JobResult that originated
from a different Job subclass even if technically they are the same type
(hint: we can get the actual concrete type from the job member variable).
- _run_job method only gets passed with the correct subclass of Job
"""

V = TypeVar("V")

@dataclass(kw_only=True)
class Job(Generic[V]):
    job_id: uuid.UUID = dataclasses.field(default_factory = lambda: uuid.uuid4())

    def ok(self, result: V) -> JobResult[V]:
        return JobResult(job=self, status="ok", value=result, error_message=None)

    def err(self, error_message: str) -> JobResult[V]:
        return JobResult(job=self, status="err", value=None, error_message=error_message)

@dataclass(kw_only=True)
class JobResult(Generic[V]):
    job: Job[V]
    value: V | None
    status: str
    error_message: str | None

    def __post_init__(self):
        assert self.value is None or self.error_message is None
        assert self.value is not None or self.error_message is not None
        assert self.status == "ok" or self.status == "err"

    def is_ok(self) -> bool:
        return self.status == "ok"

    def get(self) -> V:
        assert self.value is not None
        return self.value

    def get_error_message(self) -> str:
        assert self.error_message is not None
        return self.error_message

class Service(Generic[V], ABC):
    _job_queue: Queue[Job[V]]
    _result_queue: Queue[JobResult[V]]
    @dataclass(kw_only=True)
    class Shared:
        thread: threading.Thread
        is_shutdown_requested: bool
        lock: threading.Lock
    _shared_resource: Shared

    def __init__(self):
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

    def queue_job(self, job: Job[V]):
        self._job_queue.put(job)

    def retrieve_results(self, max_amount: int = 100) -> list[JobResult[V]]:
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

    @abstractmethod
    def _run_job(self, job: Job[V]) -> JobResult[V]:
        pass