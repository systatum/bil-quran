from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional, Literal, TypeAlias
from pydantic import BaseModel, RootModel, Field
import re


class ListPodsResponse(BaseModel):
    pods: list[Pod]


class RunpodErrorBody(BaseModel):
    title: str
    status: int
    detail: str
    errors: Optional[list[str]]


class Pod(BaseModel):
    id: str
    name: str
    status: PodStatusType
    actions: list[PodActionType]
    data_center_id: str = Field(validation_alias="dataCenterId")
    started_at: Optional[datetime] = Field(validation_alias="startedAt")

    def matches_pattern(self, pattern: str) -> bool:
        """Checks if the pod name matches your target regex."""
        return re.fullmatch(pattern, self.name) is not None

    def active_duration_seconds(self) -> float:
        """Calculates total runtime in seconds since the pod started."""
        if self.started_at is None:
            return 0.0

        if self.status != "RUNNING":
            return 0.0

        # Ensure comparison is timezone-aware
        now = datetime.now(timezone.utc)
        start = (
            self.started_at
            if self.started_at.tzinfo
            else self.started_at.replace(tzinfo=timezone.utc)
        )
        return (now - start).total_seconds()


class PodAction(RootModel):
    root: PodActionType


PodActionType: TypeAlias = Literal["start", "stop", "restart", "terminate"]
PodStatusType: TypeAlias = Literal[
    "PROVISIONING", "STARTING", "RUNNING", "EXITED", "ERROR", "TERMINATED"
]
