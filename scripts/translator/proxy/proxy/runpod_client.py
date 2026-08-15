from shared.util import format_and_log_errors
from proxy.runpod_struct import Pod, PodAction, RunpodErrorBody, ListPodsResponse
from typing import Any, TypeVar
from dataclasses import dataclass
from traceback import format_exc
from pydantic import ValidationError, TypeAdapter
from enum import Enum
import requests
import typing
import json

T = TypeVar("T")


class RunpodAPIErrorType(Enum):
    UNSPECIFIED = 1
    HTTP_ERROR = 2
    MALFORMED_RESPONSE_BODY = 4
    UNEXPECTED_RESPONSE_FORMAT = 5
    RUNPOD_ERROR = 6


@dataclass(kw_only=True)
class RunpodAPIError(Exception):
    error_type: RunpodAPIErrorType
    http_status: int | None
    message: str


class RunpodAPIClient:
    @dataclass(kw_only=True)
    class Setting:
        base_url: str = "https://api.runpod.io/v2"
        api_key: str | None = None

    setting: Setting
    session: requests.Session

    def __init__(self, setting: Setting | None = None):
        if setting is None:
            self.setting = self.Setting()
        else:
            self.setting = setting

        self.session = requests.Session()
        self.session.headers = typing.cast(
            Any, {"Content-Type": "application/json", "accept": "application/json"}
        )
        if self.setting.api_key is not None:
            self.session.headers = self.session.headers | typing.cast(
                Any, {"Authorization": f"Bearer {self.setting.api_key}"}
            )

    def list_pods(self) -> list[Pod]:
        return self._request("/pods", TypeAdapter(ListPodsResponse)).pods

    def stop_pod(self, pod_id: str) -> Pod:
        return self._request(
            f"/pods/{pod_id}/action",
            TypeAdapter(Pod),
            data=PodAction(action="stop").model_dump_json(),
        )

    def _request(
        self,
        path: str,
        adapter: TypeAdapter[T],
        data: str | None = None,
        force_post: bool = False,
    ) -> T:
        try:
            if data is not None:
                response: requests.Response = self.session.post(
                    self.setting.base_url + path, data=data.encode("utf-8")
                )
            elif force_post:
                response: requests.Response = self.session.post(
                    self.setting.base_url + path
                )
            else:
                response: requests.Response = self.session.get(
                    self.setting.base_url + path
                )
        except requests.RequestException as e:
            error_message = format_and_log_errors(
                "{}: {}", type(e).__name__, format_exc()
            )
            raise RunpodAPIError(
                error_type=RunpodAPIErrorType.HTTP_ERROR,
                http_status=None,
                message=error_message,
            )

        response_text = self._process_response(response)
        try:
            return adapter.validate_json(response_text)
        except ValidationError as e:
            error_message = format_and_log_errors(
                "{}: {}", type(e).__name__, format_exc()
            )
            raise RunpodAPIError(
                error_type=RunpodAPIErrorType.UNEXPECTED_RESPONSE_FORMAT,
                http_status=200,
                message=error_message,
            )

    def _process_response(self, response: requests.Response) -> str:
        if response.status_code != 200:
            try:
                runpod_error = RunpodErrorBody.model_validate_json(response.text)
            except ValidationError as e:
                error_message = format_and_log_errors(
                    "{}: {}", type(e).__name__, format_exc()
                )
                raise RunpodAPIError(
                    error_type=RunpodAPIErrorType.MALFORMED_RESPONSE_BODY,
                    http_status=response.status_code,
                    message=error_message,
                )

            if response.status_code != runpod_error.status:
                error_message = format_and_log_errors(
                    "HTTP Status {} but found error status {}",
                    response.status_code,
                    runpod_error.status,
                )
                raise RunpodAPIError(
                    error_type=RunpodAPIErrorType.MALFORMED_RESPONSE_BODY,
                    http_status=response.status_code,
                    message=error_message,
                )

            if runpod_error.errors is not None:
                error_message = format_and_log_errors(
                    "{}: {}\nErrors: {}",
                    runpod_error.title,
                    runpod_error.detail,
                    json.dumps(runpod_error.errors, indent=4),
                )
            else:
                error_message = format_and_log_errors(
                    "{}: {}",
                    runpod_error.title,
                    runpod_error.detail,
                )
            raise RunpodAPIError(
                error_type=RunpodAPIErrorType.RUNPOD_ERROR,
                http_status=response.status_code,
                message=error_message,
            )

        return response.text
