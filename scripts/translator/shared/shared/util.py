from typing import Generic, TypeVar, Literal, Self
from dataclasses import dataclass
import sys

V = TypeVar("V")
E = TypeVar("E")
T = TypeVar("T")


def printerr(*args, **kwargs):
    file = kwargs.pop("file", sys.stderr)
    print(*args, file=file, **kwargs)


def format_and_log_errors(fmt: str, *args, **kwargs) -> str:
    value = fmt.format(*args, **kwargs)
    printerr(value, file=sys.stderr)
    return value


@dataclass(kw_only=True)
class OkVariant(Generic[V]):
    status: Literal["ok"] = "ok"
    value: V


@dataclass(kw_only=True)
class ErrVariant(Generic[E]):
    status: Literal["err"] = "err"
    error: E


@dataclass()
class Result(Generic[V, E]):
    _value: OkVariant[V] | ErrVariant[E]

    @classmethod
    def ok(cls, value: V) -> Self:
        return cls(_value=OkVariant(value=value))

    @classmethod
    def err(cls, error: E) -> Self:
        return cls(_value=ErrVariant(error=error))

    def is_ok(self) -> bool:
        return self._value.status == "ok"

    def is_err(self) -> bool:
        return self._value.status == "err"

    def get_value(self) -> V:
        if isinstance(self._value, OkVariant):
            return self._value.value
        raise ValueError(f"Called value() on an ErrVariant value: {self._value.error}")

    def get_error(self) -> E:
        if isinstance(self._value, ErrVariant):
            return self._value.error
        raise ValueError(f"Called error() on an OkVariant value: {self._value.value}")
