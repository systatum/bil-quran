from __future__ import annotations
from typing import TypeVar, Generic, Literal, Self, TypeAlias
from pydantic import ConfigDict, BaseModel, RootModel, model_validator
from enum import Enum

T = TypeVar("T")


class ErrorCode(Enum):
    UNSPECIFIED_ERROR = 1


class APIError(BaseModel):
    error_message: str = "An unspecified error has happened"
    error_code: ErrorCode = ErrorCode.UNSPECIFIED_ERROR

    # Extra fields are not allowed
    # Assigning value to model's field is validated
    model_config = ConfigDict(
        extra="forbid",
        validate_assignment=True,
    )


class APIResponse(BaseModel, Generic[T]):
    """
    NOTE:
        T MUST NOT include None (e.g. `APIResponse[int | None]` is unsupported).
        If a nullable payload is required, wrap it in another model.
    """

    status: Literal["ok", "err"]
    value: T | None
    error: APIError | None

    # Extra fields are not allowed
    # Assigning value to model's field is validated
    # Instance is always (re-)validated since instance is of type dataclass not BaseModel
    model_config = ConfigDict(
        extra="forbid",
        validate_assignment=True,
        revalidate_instances="always",
    )

    @model_validator(mode="after")
    def ensure_value_or_error(self) -> Self:
        if self.status == "ok":
            if self.error is not None:
                raise ValueError("APIResponse of status ok must have None error")
            if self.value is None:
                raise ValueError("APIResponse of status ok must have non-None value")
        if self.status == "err":
            if self.value is not None:
                raise ValueError("APIResponse of status err must have None value")
            if not isinstance(self.error, APIError):
                raise ValueError(
                    "APIResponse of status err must have error of type APIError"
                )
        return self

    @classmethod
    def ok(cls, value: T) -> APIResponse[T]:
        return cls(status="ok", value=value, error=None)

    @classmethod
    def err(cls, error: APIError) -> APIResponse[T]:
        return cls(status="err", value=None, error=error)


class APIRequest(RootModel[T]):
    # Assigning value to model's field is validated
    # Instance is always (re-)validated since instance is of type dataclass not BaseModel
    model_config = ConfigDict(validate_assignment=True, revalidate_instances="always")


from src.translation import (
    TranslateJob,
    TranslateInput,
    PromptSetting,
    Translation,
)
from src.rating import RateJob, Rating
from src.comparison import CompareJob, Comparison
from src.service import JobResultOk as JobResult

TranslateJobResult: TypeAlias = JobResult[Translation]
RateJobResult: TypeAlias = JobResult[Rating]
CompareJobResult: TypeAlias = JobResult[Comparison]

ModelAPIResponse = APIResponse[list[str]]
TranslateAPIRequest = APIRequest[TranslateJob]
TranslateAPIResponse = APIResponse[TranslateJobResult]
RateAPIRequest = APIRequest[RateJob]
RateAPIResponse = APIResponse[RateJobResult]
CompareAPIRequest = APIRequest[CompareJob]
CompareAPIResponse = APIResponse[CompareJobResult]

# Exported symbols
__all__ = [
    "APIResponse",
    "APIRequest",
    "ModelAPIResponse",
    "TranslateAPIRequest",
    "TranslateJob",
    "TranslateInput",
    "PromptSetting",
    "Translation",
    "TranslateAPIResponse",
    "RateAPIRequest",
    "RateJob",
    "Rating",
    "RateAPIResponse",
    "CompareAPIRequest",
    "CompareJob",
    "Comparison",
    "CompareAPIResponse",
]
