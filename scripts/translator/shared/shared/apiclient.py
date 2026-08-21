from shared import api
from typing import Any, TypeVar
from dataclasses import dataclass
from traceback import format_exc
from pydantic import ValidationError, TypeAdapter
from enum import Enum
import requests
import sys
import typing

T = TypeVar("T")


class APIErrorType(Enum):
    UNKNOWN_ERROR = 1
    HTTP_REQUEST_ERROR = 2
    FASTAPI_ERROR = 3
    APPLICATION_ERROR = 4
    MALFORMED_RESPONSE_ERROR = 5


@dataclass(kw_only=True)
class APIError(Exception):
    http_code: int | None
    error_message: str
    error_type: APIErrorType


def printerr(*args, **kwargs):
    file = kwargs.pop("file", sys.stderr)
    print(*args, file=file, **kwargs)


class APIClient:
    @dataclass(kw_only=True)
    class Setting:
        base_url: str = "http://localhost:8000"
        token: str | None = None

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
        if self.setting.token is not None:
            self.session.headers = self.session.headers | typing.cast(
                Any, {"Authorization": f"Bearer {self.setting.token}"}
            )

    def health(self) -> api.HealthResult:
        """
        RAISES:
            APIError
        """
        return self._request("/health", TypeAdapter(api.HealthResult))

    def models(self) -> list[str]:
        """
        RAISES:
            APIError
        """
        return self._request("/models", TypeAdapter(list[str]))

    def translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
        model: str,
        prompt_setting: api.internal.PromptSetting,
    ) -> api.internal.Translation:
        """
        RAISES:
            APIError
        """
        translate_input = api.internal.TranslateInput(
            source_language=source_language, target_language=target_language, text=text
        )
        request = api.internal.TranslateAPIRequest(
            api.internal.TranslateJob(
                translate_input=translate_input, setting=prompt_setting, model=model
            )
        )
        return self._translate(request).value

    def rate(self, source: str, translation: str) -> api.internal.Rating:
        """
        RAISES:
            APIError
        """
        request = api.internal.RateAPIRequest(
            api.internal.RateJob(source=source, translation=translation)
        )
        return self._rate(request).value

    def compare(
        self, source: str, translation0: str, translation1: str
    ) -> api.internal.Comparison:
        """
        RAISES:
            APIError
        """
        request = api.internal.CompareAPIRequest(
            api.internal.CompareJob(
                source=source, translation0=translation0, translation1=translation1
            )
        )
        return self._compare(request).value

    def _translate(
        self, request: api.internal.TranslateAPIRequest
    ) -> api.internal.TranslateJobResultOk:
        """
        RAISES:
            APIError
        """
        return self._request(
            "/translate",
            TypeAdapter(api.internal.TranslateJobResultOk),
            request.model_dump_json(),
        )

    def _rate(
        self, request: api.internal.RateAPIRequest
    ) -> api.internal.RateJobResultOk:
        """
        RAISES:
            APIError
        """
        return self._request(
            "/rate",
            TypeAdapter(api.internal.RateJobResultOk),
            request.model_dump_json(),
        )

    def _compare(
        self, request: api.internal.CompareAPIRequest
    ) -> api.internal.CompareJobResultOk:
        """
        RAISES:
            APIError
        """
        return self._request(
            "/compare",
            TypeAdapter(api.internal.CompareJobResultOk),
            request.model_dump_json(),
        )

    def _format_and_log_errors(self, fmt: str, *args, **kwargs) -> str:
        value = fmt.format(*args, **kwargs)
        printerr(value, file=sys.stderr)
        return value

    def _request(
        self,
        path: str,
        adapter: TypeAdapter[T],
        json_data: dict | None = None,
        force_post: bool = False,
    ) -> T:
        """
        RAISES:
            APIError
        """
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
            error_message = self._format_and_log_errors(
                "{}: {}", type(e).__name__, format_exc()
            )
            raise APIError(
                http_code=None,
                error_message=error_message,
                error_type=APIErrorType.HTTP_REQUEST_ERROR,
            )

        value = self._process_response(response)
        try:
            return adapter.validate_python(value)
        except ValidationError as e:
            error_message = self._format_and_log_errors(
                "{}: {}", type(e).__name__, format_exc()
            )
            raise APIError(
                http_code=response.status_code,
                error_message=error_message,
                error_type=APIErrorType.MALFORMED_RESPONSE_ERROR,
            )

    def _process_response(self, response: requests.Response) -> object:
        """
        RAISES:
            APIError
        """

        # It's not our server that responded
        if response.status_code != 200:
            error_message = self._format_and_log_errors(
                "HTTP {}: {}", response.status_code, response.text
            )
            raise APIError(
                http_code=response.status_code,
                error_message=error_message,
                error_type=APIErrorType.FASTAPI_ERROR,
            )

        try:
            api_response: api.APIResponse[Any] = api.APIResponse[
                Any
            ].model_validate_json(response.text)
        except ValidationError as e:
            error_message = self._format_and_log_errors(
                "{}: {}", type(e).__name__, format_exc()
            )
            raise APIError(
                http_code=response.status_code,
                error_message=error_message,
                error_type=APIErrorType.MALFORMED_RESPONSE_ERROR,
            )

        if api_response.status == "err":
            error: api.APIError = typing.cast(api.APIError, api_response.error)
            error_message = self._format_and_log_errors(
                "{}: {}", error.error_code, error.error_message
            )
            raise APIError(
                http_code=response.status_code,
                error_message=error_message,
                error_type=APIErrorType.APPLICATION_ERROR,
            )

        return api_response.value
