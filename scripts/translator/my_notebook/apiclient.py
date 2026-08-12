from src import api
from typing import Any, TypeVar
from dataclasses import dataclass
from traceback import format_exc
from pydantic import ValidationError, TypeAdapter
import requests
import sys
import typing

T = TypeVar("T")


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

    def models(self) -> list[str]:
        return self._request("/models", TypeAdapter(list[str]))

    def translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
        model: str,
        prompt_setting: api.PromptSetting,
    ) -> api.Translation:
        translate_input = api.TranslateInput(
            source_language=source_language, target_language=target_language, text=text
        )
        request = api.TranslateAPIRequest(
            api.TranslateJob(
                translate_input=translate_input, setting=prompt_setting, model=model
            )
        )
        return self._translate(request).value

    def rate(self, source: str, translation: str) -> api.Rating:
        request = api.RateAPIRequest(
            api.RateJob(source=source, translation=translation)
        )
        return self._rate(request).value

    def compare(
        self, source: str, translation0: str, translation1: str
    ) -> api.Comparison:
        request = api.CompareAPIRequest(
            api.CompareJob(
                source=source, translation0=translation0, translation1=translation1
            )
        )
        return self._compare(request).value

    def _translate(self, request: api.TranslateAPIRequest) -> api.TranslateJobResult:
        return self._request(
            "/translate", TypeAdapter(api.TranslateJobResult), request.model_dump()
        )

    def _rate(self, request: api.RateAPIRequest) -> api.RateJobResult:
        return self._request(
            "/rate", TypeAdapter(api.RateJobResult), request.model_dump()
        )

    def _compare(self, request: api.CompareAPIRequest) -> api.CompareJobResult:
        return self._request(
            "/compare", TypeAdapter(api.CompareJobResult), request.model_dump()
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
        TODO: detail raises
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
                "Request error {}: {}", type(e).__name__, format_exc()
            )
            raise Exception()

        value = self._process_response(response)
        try:
            return adapter.validate_python(value)
        except ValidationError as e:
            error_message = self._format_and_log_errors(
                "Request error {}: {}", type(e).__name__, format_exc()
            )
            raise Exception()

    def _process_response(self, response: requests.Response) -> object:
        """
        TODO: detail raises
        """

        # It's not our server that responded
        if response.status_code != 200:
            error_message = self._format_and_log_errors(
                "HTTP {}: {}", response.status_code, response.text
            )
            raise Exception()

        try:
            api_response: api.APIResponse[Any] = api.APIResponse[
                Any
            ].model_validate_json(response.text)
        except ValidationError as e:
            error_message = self._format_and_log_errors(
                "Request error {}: {}", type(e).__name__, format_exc()
            )
            raise Exception()

        if api_response.status == "err":
            error: api.APIError = typing.cast(api.APIError, api_response.error)
            error_message = self._format_and_log_errors(
                "API error {}: {}", error.error_code, error.error_message
            )
            raise Exception()

        return api_response.value
