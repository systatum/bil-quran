from __future__ import annotations
from beam import Pod, Image
from dataclasses import asdict, dataclass
from typing import TypeAlias, cast, Any
from enum import Enum
from traceback import format_exc
from datetime import datetime
import re
import requests
import sys
import json
import time


def load_token(path: str) -> str:
    with open(path) as f:
        return f.read().strip()


def printerr(*args, **kwargs):
    file = kwargs.pop("file", sys.stderr)
    print(*args, file=file, **kwargs)


@dataclass
class Container:
    container_id: str
    stub_id: str
    status: str
    scheduled_at: datetime
    started_at: datetime
    workspace_id: str
    worker_id: str
    machine_id: str
    deployment_id: str

    @classmethod
    def from_dict(cls, data: dict) -> Container:
        """
        Consumes the data

        Raises: ValueError
        If any field is invalid or there are excess fields
        """

        def extract(key: str) -> Any:
            val = data.pop(key, None)
            if val is None:
                raise ValueError(f"Missing or null field: '{key}'")
            return val

        container_id = extract("containerId")
        stub_id = extract("stubId")
        status = extract("status")
        workspace_id = extract("workspaceId")
        worker_id = extract("workerId")
        machine_id = extract("machineId")
        deployment_id = extract("deploymentId")

        scheduled_at_str = extract("scheduledAt")
        scheduled_at = datetime.fromisoformat(scheduled_at_str)

        started_at_str = extract("startedAt")
        started_at = datetime.fromisoformat(started_at_str)

        if len(data.keys()) != 0:
            raise ValueError(f"Excess fields found in payload: {list(data.keys())}")

        return cls(
            container_id=container_id,
            stub_id=stub_id,
            status=status,
            scheduled_at=scheduled_at,
            started_at=started_at,
            workspace_id=workspace_id,
            worker_id=worker_id,
            machine_id=machine_id,
            deployment_id=deployment_id,
        )


class BeamAPIErrorType(Enum):
    REQUEST_ERROR = 1
    JSON_DECODE_ERROR = 2
    GENERIC_HTTP_ERROR = 3
    BEAM_HTTP_ERROR = 4
    HTTP_200_NOT_BEAM = 5
    BEAM_200_ERROR = 6


@dataclass
class BeamAPIError(RuntimeError):
    status_code: int | None
    error_type: BeamAPIErrorType
    message: str


class APIManager:
    SuccessfulResponse: TypeAlias = dict
    session: requests.Session

    def __init__(self, api_token: str):
        self.session = requests.Session()
        self.session.headers = cast(Any, {"Authorization": f"Bearer {api_token}"})

    def list_container(self) -> list[Container] | None:
        url = "https://app.beam.cloud/api/v1/gateway/containers"
        try:
            response = self._beam_request(url)
        except BeamAPIError:
            return None

        containers: dict = cast(dict, response.get("containers"))
        if containers is None:
            self._format_and_log_errors(
                "Beam returned invalid data format {}", json.dumps(response, indent=4)
            )
            return None

        try:
            return [Container.from_dict(container) for container in containers]
        except ValueError:
            self._format_and_log_errors(
                "Beam returned invalid data format {}", json.dumps(response, indent=4)
            )
            return None

    def stop_container(self, container_id: str) -> bool:
        url = f"https://app.beam.cloud/api/v1/gateway/containers/{container_id}/stop"
        try:
            response = self._beam_request(url, force_post=True)
            if len(response.keys()) != 0:
                self._format_and_log_errors(
                    "Beam returned invalid data format {}",
                    json.dumps(response, indent=4),
                )
            return True
        except BeamAPIError:
            return False

    def _format_and_log_errors(self, fmt: str, *args, **kwargs) -> str:
        value = fmt.format(*args, **kwargs)
        printerr(value, file=sys.stderr)
        return value

    def _beam_request(
        self, url: str, data: dict | None = None, force_post: bool = False
    ) -> SuccessfulResponse:
        """
        Raises: BeamAPIError
        """
        try:
            if data is not None:
                with self.session as s:
                    response: requests.Response = s.post(url, json=data)
            elif force_post:
                with self.session as s:
                    response: requests.Response = s.post(url)
            else:
                with self.session as s:
                    response: requests.Response = s.get(url)
        except requests.RequestException as e:
            error_message = self._format_and_log_errors(
                "Request error {}: {}", type(e).__name__, format_exc()
            )
            raise BeamAPIError(None, BeamAPIErrorType.REQUEST_ERROR, error_message)

        return self._process_response(response)

    def _process_response(self, response: requests.Response) -> SuccessfulResponse:
        """
        Raises: BeamAPIError
        """
        E = BeamAPIErrorType
        try:
            response_data: dict = response.json()
        except json.JSONDecodeError:
            error_message = self._format_and_log_errors(
                "HTTP {}: {}", response.status_code, response.text
            )
            raise BeamAPIError(response.status_code, E.JSON_DECODE_ERROR, error_message)

        if response.status_code != 200:
            if not self._is_response_beam(False, response_data):
                error_message = self._format_and_log_errors(
                    "HTTP {}\nReceived non-beam response: {}",
                    response.status_code,
                    json.dumps(response_data, indent=4),
                )
                raise BeamAPIError(
                    response.status_code, E.GENERIC_HTTP_ERROR, error_message
                )

            http_error_message = "HTTP {} code {}: {}".format(
                response.status_code,
                response_data.get("code"),
                response_data.get("message"),
            )
            error_detail_message = json.dumps(
                response_data.get("details", []), indent=4
            )
            error_message = self._format_and_log_errors(
                "{}\n{}", http_error_message, error_detail_message
            )
            raise BeamAPIError(
                response.status_code,
                E.BEAM_HTTP_ERROR,
                error_message,
            )

        if not self._is_response_beam(True, response_data):
            error_message = self._format_and_log_errors(
                "Received non-beam response {}", json.dumps(response_data, indent=4)
            )
            raise BeamAPIError(response.status_code, E.HTTP_200_NOT_BEAM, error_message)

        if not response_data.get("ok"):
            error_message = self._format_and_log_errors(
                "Error: {}", response_data["errorMsg"]
            )
            raise BeamAPIError(response.status_code, E.BEAM_200_ERROR, error_message)

        if response_data.get("errorMsg") != "":
            error_message = self._format_and_log_errors(
                "Error: {}", response_data["errorMsg"]
            )
            raise BeamAPIError(response.status_code, E.BEAM_200_ERROR, error_message)

        response_data.pop("ok")
        response_data.pop("errorMsg")
        return response_data

    def _is_response_beam(self, status_200: bool, response_data: dict) -> bool:
        if status_200:
            if response_data.get("ok", None) is None:
                return False
            if response_data.get("errorMsg", None) is None:
                return False
            return True
        else:
            if response_data.get("code", None) is None:
                return False
            if response_data.get("message", None) is None:
                return False
            if response_data.get("details", None) is None:
                return False
            return True


def short():
    time.sleep(3)
    print("Done sleeping shortly")


def long():
    time.sleep(60)
    print("Done sleeping longly")


def many():
    api = APIManager(load_token("beam.token"))
    results = [
        Pod(
            cpu=1,
            memory="1Gi",
            image=Image(python_version="python3.11"),
            entrypoint=["python", "-m", "proxy.long"],
        ).create()
        for _ in range(10)
    ]
    time.sleep(10)
    print(api.list_container())
    time.sleep(3)
    [api.stop_container(result.container_id) for result in results]


def main():
    api = APIManager(load_token("beam.token"))
    pod = Pod(
        cpu=1,
        memory="1Gi",
        image=Image(python_version="python3.11"),
        entrypoint=["python", "-m", "proxy.long"],
    )
    result = pod.create()
    time.sleep(10)
    print(api.list_container())
    api.stop_container(result.container_id)


if __name__ == "__main__":
    many()
