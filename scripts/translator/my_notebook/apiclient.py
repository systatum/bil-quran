import src.shared as api
from typing import Callable, Any
import requests
import sys
from dataclasses import dataclass, asdict
import traceback


class APIClient:
    @dataclass(kw_only=True)
    class Setting:
        base_url: str = "http://localhost:8000"
        max_retry: int = 5
        timeout: float = 60.0
        authorization: str | None = None

    class RetryException(Exception):
        pass

    setting: Setting

    def __init__(self, setting: Setting | None = None):
        if setting is None:
            self.setting = self.Setting()
        else:
            self.setting = setting

    def _request(
        self,
        path: str,
        data: dict | None = None,
        transformer: Callable[[Any], Any] | None = None,
    ) -> Any:
        """
        Raises RuntimeError if desired result can't be fetched.
        Raises ValueError if path does not start with /.
        """
        if not path.startswith("/"):
            raise ValueError(f"Path {path} does not start with /")

        setting = self.setting
        auth_header = {"Authorization": setting.authorization} if setting.authorization is not None else {}

        for _ in range(setting.max_retry):
            try:
                if data is None:
                    response = requests.get(
                        setting.base_url + path, timeout=setting.timeout, headers=auth_header
                    )
                else:
                    response = requests.post(
                        setting.base_url + path,
                        json=data,
                        headers={"Content-Type": "application/json"} | auth_header,
                        timeout=setting.timeout,
                    )
            except requests.RequestException as e:
                print(
                    f"Unexpected error {type(e).__name__}: {traceback.format_exc()}",
                    file=sys.stderr,
                )
                continue

            if not 200 <= response.status_code <= 299:
                print(
                    "Request error:", response.status_code, response.text, file=sys.stderr
                )
                continue

            try:
                json_body = response.json()
            except requests.JSONDecodeError:
                print("Invalid JSON:", response.text, file=sys.stderr)
                continue

            if transformer is None:
                return json_body

            try:
                return transformer(json_body)
            except self.RetryException as e:
                print(f"Transform requested retry: {e}", file=sys.stderr)
                continue

        raise RuntimeError(
            f"Failed to request {path} after {setting.max_retry} attempts"
        )

    def models(self) -> list[str]:
        def transformer(json_body: Any) -> list[str]:
            if not isinstance(json_body, list):
                raise self.RetryException("Models returnend non-list")
            for i in range(len(json_body)):
                if not isinstance(json_body[i], str):
                    raise self.RetryException("Found non-string entry in models")
            return json_body

        return self._request("/models", transformer=transformer)

    def translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
        model: str,
        prompt_setting: api.PromptSetting | None = None,
    ) -> api.Translation:
        if prompt_setting is None:
            prompt_setting = api.PromptSetting()

        translate_input: api.TranslateInput = api.TranslateInput(
            source_language=source_language, target_language=target_language, text=text
        )

        api_request: api.TranslateAPIRequest = api.TranslateAPIRequest(
            translate_input=translate_input, model=model, setting=prompt_setting
        )

        def transformer(json_body: Any) -> api.Translation:
            try:
                job_result: api.TranslateJobResult = api.TranslateJobResult(**json_body)
            except:
                raise self.RetryException("Unable to parse TranslateJobResult")

            if not job_result.is_ok():
                raise self.RetryException(job_result.get_error_message())
            return job_result.get()

        return self._request(
            "/translate", data=asdict(api_request), transformer=transformer
        )

    def rate(self, source: str, translation: str) -> api.Rating:
        api_request: api.RateAPIRequest = api.RateAPIRequest(
            source=source,
            translation=translation,
        )

        def transformer(json_body: Any) -> api.Rating:
            try:
                job_result: api.RateJobResult = api.RateJobResult(**json_body)
            except:
                raise self.RetryException("Unable to parse RateJobResult")

            if not job_result.is_ok():
                raise self.RetryException(job_result.get_error_message())
            return job_result.get()

        return self._request(
            "/rate", data=asdict(api_request), transformer=transformer
        )

    def compare(
        self, source: str, translation0: str, translation1: str
    ) -> api.Comparison:
        api_request: api.CompareAPIRequest = api.CompareAPIRequest(
            source=source, translation0=translation0, translation1=translation1
        )

        def transformer(json_body: Any) -> api.Comparison:
            try:
                job_result: api.CompareJobResult = api.CompareJobResult(**json_body)
            except:
                raise self.RetryException("Unable to parse CompareJobResult")

            if not job_result.is_ok():
                raise self.RetryException(job_result.get_error_message())
            return job_result.get()

        return self._request(
            "/compare", data=asdict(api_request), transformer=transformer
        )