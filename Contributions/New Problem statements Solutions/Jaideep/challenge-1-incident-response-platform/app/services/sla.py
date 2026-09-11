"""SLA calculation and lazy escalation.

Escalation runs on read (list/detail/dashboard) rather than on a scheduler, so the
application needs no background worker.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from app.models import Incident, SLAStatus, Severity, Status
from app.services import incidents as incident_service
from app.utils.time import now_utc

SLA_HOURS: dict[Severity, int] = {Severity.P1: 2, Severity.P2: 4, Severity.P3: 8}

APPROACHING_THRESHOLD = 0.25

NO_TIMESTAMP_WARNING = (
    "This incident has no valid creation timestamp, so its SLA cannot be calculated."
)


STATUS_LABELS = {
    SLAStatus.WITHIN_SLA: "Within SLA",
    SLAStatus.APPROACHING_SLA: "Approaching SLA",
    SLAStatus.SLA_BREACHED: "SLA breached",
    SLAStatus.NOT_APPLICABLE: "Not applicable",
}


@dataclass(frozen=True)
class SLAInfo:
    status: SLAStatus
    targetHours: int
    deadline: datetime | None = None
    elapsed: timedelta | None = None
    remaining: timedelta | None = None
    percentRemaining: float | None = None
    percentElapsed: float | None = None
    resolvedWithinSla: bool | None = None
    warning: str | None = None

    @property
    def is_breached(self) -> bool:
        return self.status is SLAStatus.SLA_BREACHED

    @property
    def label(self) -> str:
        if self.status is SLAStatus.NOT_APPLICABLE and self.resolvedWithinSla is True:
            return "Resolved within SLA"
        if self.status is SLAStatus.NOT_APPLICABLE and self.resolvedWithinSla is False:
            return "Resolved after SLA deadline"
        return STATUS_LABELS[self.status]

    @property
    def recommendation(self) -> str | None:
        if self.is_breached:
            return (
                "Immediate attention required: reassign to an available responder or "
                "escalate to the on-call lead."
            )
        if self.status is SLAStatus.APPROACHING_SLA:
            return "Approaching the SLA deadline — confirm an owner is actively engaged."
        return None


def format_duration(delta: timedelta | None) -> str:
    if delta is None:
        return "—"
    total_minutes = int(abs(delta).total_seconds() // 60)
    hours, minutes = divmod(total_minutes, 60)
    text = f"{hours}h {minutes:02d}m"
    return f"{text} overdue" if delta.total_seconds() < 0 else text


def compute_sla(incident: Incident, now: datetime | None = None) -> SLAInfo:
    now = now or now_utc()
    target_hours = SLA_HOURS[incident.severity]
    target = timedelta(hours=target_hours)

    if incident.createdAt is None:
        return SLAInfo(
            status=SLAStatus.NOT_APPLICABLE,
            targetHours=target_hours,
            warning=NO_TIMESTAMP_WARNING,
        )

    # Deadline always derives from the CURRENT severity, so changing severity after
    # creation moves the deadline and can flip an incident straight to breached.
    deadline = incident.createdAt + target

    if incident.status is Status.CLOSED:
        finished = incident.resolvedAt or incident.updatedAt or now
        return SLAInfo(
            status=SLAStatus.NOT_APPLICABLE,
            targetHours=target_hours,
            deadline=deadline,
            elapsed=finished - incident.createdAt,
            remaining=deadline - finished,
            percentRemaining=0.0,
            percentElapsed=min(
                100.0, round((finished - incident.createdAt) / target * 100, 1)
            ),
            resolvedWithinSla=finished <= deadline,
        )

    elapsed = now - incident.createdAt
    remaining = deadline - now
    ratio = remaining / target

    if remaining.total_seconds() <= 0:
        status = SLAStatus.SLA_BREACHED
    elif ratio <= APPROACHING_THRESHOLD:
        status = SLAStatus.APPROACHING_SLA
    else:
        status = SLAStatus.WITHIN_SLA

    return SLAInfo(
        status=status,
        targetHours=target_hours,
        deadline=deadline,
        elapsed=elapsed,
        remaining=remaining,
        percentRemaining=max(0.0, round(ratio * 100, 1)),
        percentElapsed=min(100.0, max(0.0, round(elapsed / target * 100, 1))),
    )


def check_and_escalate(incident: Incident, now: datetime | None = None) -> Incident:
    """Appends one ESCALATION entry per breach episode; safe to call on every read."""
    info = compute_sla(incident, now)

    if info.is_breached and not incident.escalated:
        return incident_service.record_escalation(
            incident.incidentId,
            f"SLA breached: {incident.severity.value} target of {info.targetHours}h "
            f"exceeded (deadline {info.deadline:%d %b %Y %H:%M} UTC). "
            "Reassign or escalate immediately.",
        )
    if not info.is_breached and incident.escalated:
        # Severity may have been lowered, extending the deadline; allow re-escalation later.
        return incident_service.clear_escalation(incident.incidentId)
    return incident


def with_sla(incidents: list[Incident], now: datetime | None = None) -> list[tuple]:
    pairs = []
    for incident in incidents:
        current = check_and_escalate(incident, now)
        pairs.append((current, compute_sla(current, now)))
    return pairs


def sla_metrics(pairs: list[tuple]) -> dict[str, int]:
    counts = {status.value: 0 for status in SLAStatus}
    for _, info in pairs:
        counts[info.status.value] += 1
    return counts
