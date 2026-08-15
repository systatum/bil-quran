from os import environ
from typing import Optional, Any, Type, Self
from abc import ABC, abstractmethod
from dataclasses import dataclass, Field
from pydantic import TypeAdapter, ValidationError
import dataclasses
import typing


@dataclass(kw_only=True, frozen=True)
class Env(ABC):
    @classmethod
    @abstractmethod
    def get(cls) -> Self:
        pass
        # return cls._load_from_env("EXAMPLE_PREFIX_")

    @classmethod
    def _load_from_env(cls, prefix: str) -> Self:
        fields: tuple[Field, ...] = dataclasses.fields(cls)
        kwargs: dict = {}
        for field in fields:
            field_name: str = prefix + field.name
            field_type: Type = typing.cast(Type, field.type)
            value: Any = environ.get(field_name, None)

            if isinstance(field_type, Env):
                kwargs[field.name] = field_type.get()
                continue

            try:
                validated: Any = TypeAdapter(field_type).validate_python(value)
            except ValidationError:
                raise ValueError(
                    "Environment variable {} of value {} cannot be coerced to type {}".format(
                        field_name, value, field_type.__name__
                    )
                )
            kwargs[field.name] = validated
        return cls(**kwargs)


@dataclass(kw_only=True, frozen=True)
class FrontendEnv(Env):
    API_KEY_DEFAULT: str
    API_KEY_LOCAL: Optional[str]
    API_KEY_REMOTE: Optional[str]

    @classmethod
    def get(cls) -> Self:
        return cls._load_from_env("FE_")


@dataclass(kw_only=True, frozen=True)
class BackendEnv(Env):
    API_KEY: str
    SETTING_SYS_PATH: str
    SETTING_PYTHON_PATH: str
    MOUNT_ROOT: str

    @classmethod
    def get(cls) -> Self:
        return cls._load_from_env("BE_")


@dataclass(kw_only=True, frozen=True)
class ProxyEnv(Env):
    RUNPOD_MANAGEMENT_KEY: str

    @classmethod
    def get(cls) -> Self:
        return cls._load_from_env("PX_")
