from __future__ import annotations
from src.util import Result
from time import sleep
from queue import Queue
from dataclasses import dataclass
from typing import Generic, TypeVar
from abc import abstractmethod, ABC
import queue
import dataclasses
import uuid
import threading

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
E = TypeVar("E")


@dataclass(kw_only=True)
class Job(Generic[V, E]):
    job_id: uuid.UUID = dataclasses.field(default_factory=lambda: uuid.uuid4())

    def ok(self, value: V) -> JobResult[V, E]:
        return JobResult(job=self, result=Result.ok(value))

    def err(self, error: E) -> JobResult[V, E]:
        return JobResult(job=self, result=Result.err(error))


@dataclass(kw_only=True)
class JobResult(Generic[V, E]):
    job: Job[V, E]
    result: Result[V, E]


@dataclass(kw_only=True)
class JobResultOk(Generic[V]):
    job: Job[V, None]
    value: V


class Service(Generic[V, E], ABC):
    _job_queue: Queue[Job[V, E]]
    _result_queue: Queue[JobResult[V, E]]

    @dataclass(kw_only=True)
    class Shared:
        thread: threading.Thread
        is_shutdown_requested: bool
        busy: bool
        lock: threading.Lock

    _shared_resource: Shared

    def __init__(self):
        self._job_queue = Queue()
        self._result_queue = Queue()
        self._shared_resource = self.Shared(
            thread=threading.Thread(target=self._loop),
            is_shutdown_requested=False,
            busy=False,
            lock=threading.Lock(),
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

    def is_busy(self) -> bool:
        with self._shared_resource.lock:
            return self._shared_resource.busy

    def queue_job(self, job: Job[V, E]):
        self._job_queue.put(job)

    def retrieve_results(self, max_amount: int = 100) -> list[JobResult[V, E]]:
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
            busy: bool = False
            try:
                job = self._job_queue.get_nowait()
                busy = True
            except queue.Empty:
                continue
            finally:
                with self._shared_resource.lock:
                    self._shared_resource.busy = busy
                    if self._shared_resource.is_shutdown_requested:
                        self._shared_resource.busy = False
                        return
            self._result_queue.put(self._run_job(job))

    @abstractmethod
    def _run_job(self, job: Job[V, E]) -> JobResult[V, E]:
        pass
