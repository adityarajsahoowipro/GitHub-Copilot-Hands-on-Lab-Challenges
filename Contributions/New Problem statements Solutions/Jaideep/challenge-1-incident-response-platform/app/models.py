"""Enums and Pydantic models for incidents (spec section 4)."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Annotated, Any

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_serializer

from app.utils.time import now_utc, parse_iso, to_iso


class Severity(str, Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"

    @property
    def label(self) -> str:
        return {"P1": "Critical", "P2": "High", "P3": "Medium"}[self.value]


class Status(str, Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    MITIGATED = "MITIGATED"
    CLOSED = "CLOSED"


class SLAStatus(str, Enum):
    WITHIN_SLA = "WITHIN_SLA"
    APPROACHING_SLA = "APPROACHING_SLA"
    SLA_BREACHED = "SLA_BREACHED"
    NOT_APPLICABLE = "NOT_APPLICABLE"


def _required_text(label: str):
    def validate(value: Any) -> str:
        if value is None:
            raise ValueError(f"{label} is required.")
        text = str(value).strip()
        if not text:
            raise ValueError(f"{label} must not be empty.")
        return text

    return validate


def _optional_text(value: Any) -> Any:
    if value is None:
        return None
    return str(value).strip()


Title = Annotated[str, BeforeValidator(_required_text("Incident title"))]
ImpactedService = Annotated[str, BeforeValidator(_required_text("Impacted service"))]
RelatedIncidentId = Annotated[str, BeforeValidator(_required_text("Related incident ID"))]
OptionalText = Annotated[str | None, BeforeValidator(_optional_text)]
# Unparseable timestamps in stored data become None instead of failing to load.
SafeDatetime = Annotated[datetime | None, BeforeValidator(parse_iso)]


class TimelineEntry(BaseModel):
    timestamp: datetime = Field(default_factory=now_utc)
    type: str
    message: str

    @field_serializer("timestamp")
    def _serialize_timestamp(self, value: datetime) -> str:
        return to_iso(value)


class IncidentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Title
    description: str = ""
    severity: Severity
    impactedService: ImpactedService
    owner: OptionalText = None


class IncidentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: OptionalText = None
    description: OptionalText = None
    severity: Severity | None = None
    status: Status | None = None
    impactedService: OptionalText = None
    owner: OptionalText = None


class Incident(BaseModel):
    incidentId: str
    title: Title
    description: str = ""
    severity: Severity
    status: Status = Status.OPEN
    owner: OptionalText = None
    impactedService: ImpactedService
    createdAt: SafeDatetime = Field(default_factory=now_utc)
    updatedAt: SafeDatetime = Field(default_factory=now_utc)
    resolvedAt: SafeDatetime = None
    escalated: bool = False
    relatedIncidents: list[str] = Field(default_factory=list)
    timeline: list[TimelineEntry] = Field(default_factory=list)

    @field_serializer("createdAt", "updatedAt", "resolvedAt")
    def _serialize_datetimes(self, value: datetime | None) -> str | None:
        return to_iso(value) if value else None


class RelatedMatch(BaseModel):
    """A suggested related incident together with the rules that matched it."""

    incidentId: str
    title: str
    impactedService: str
    severity: Severity
    status: Status
    createdAt: SafeDatetime = None
    score: int
    reasons: list[str] = Field(default_factory=list)
    linked: bool = False

    @field_serializer("createdAt")
    def _serialize_created_at(self, value: datetime | None) -> str | None:
        return to_iso(value) if value else None


class IncidentLinkCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    relatedIncidentId: RelatedIncidentId


class RCAReport(BaseModel):
    incidentId: str
    incidentSummary: str = ""
    rootCause: str = ""
    impactedServices: list[str] = Field(default_factory=list)
    resolution: str = ""
    lessonsLearned: str = ""
    recommendations: list[str] = Field(default_factory=list)
    generatedAt: datetime = Field(default_factory=now_utc)
    updatedAt: datetime = Field(default_factory=now_utc)

    @field_serializer("generatedAt", "updatedAt")
    def _serialize_datetimes(self, value: datetime) -> str:
        return to_iso(value)


class RCAUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    incidentSummary: OptionalText = None
    rootCause: OptionalText = None
    impactedServices: list[str] | None = None
    resolution: OptionalText = None
    lessonsLearned: OptionalText = None
    recommendations: list[str] | None = None


class RCAResponse(BaseModel):
    """Warnings are recomputed on every read so they never go stale."""

    report: RCAReport
    warnings: list[str] = Field(default_factory=list)
