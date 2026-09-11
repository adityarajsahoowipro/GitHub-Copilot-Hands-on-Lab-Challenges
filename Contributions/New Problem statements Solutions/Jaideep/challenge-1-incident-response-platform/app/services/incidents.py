"""Incident business rules. Routers must not duplicate any logic from here."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from app.config import ensure_data_files, get_incidents_file
from app.errors import DuplicateIncidentError, InvalidTransitionError, NotFoundError
from app.models import Incident, IncidentCreate, IncidentUpdate, Severity, Status, TimelineEntry
from app.storage import JsonStore, get_store
from app.utils.time import now_utc

ID_PREFIX = "INC-"
_ID_PATTERN = re.compile(rf"^{ID_PREFIX}(\d+)$")

# Explicit ordering: alphabetical sorting would put P1/P2/P3 in the right order by
# accident, but would silently break if severities are ever renamed.
SEVERITY_RANK: dict[Severity, int] = {Severity.P1: 0, Severity.P2: 1, Severity.P3: 2}

STATUS_RANK: dict[Status, int] = {
    Status.OPEN: 0,
    Status.INVESTIGATING: 1,
    Status.MITIGATED: 2,
    Status.CLOSED: 3,
}

SORT_FIELDS = ("createdAt", "updatedAt", "severity", "status", "incidentId", "title")

ALLOWED_TRANSITIONS: dict[Status, set[Status]] = {
    Status.OPEN: {Status.INVESTIGATING},
    Status.INVESTIGATING: {Status.MITIGATED},
    Status.MITIGATED: {Status.CLOSED},
    Status.CLOSED: {Status.OPEN},
}


def _store() -> JsonStore:
    ensure_data_files()
    return get_store(get_incidents_file(), "incidentId")


def _next_incident_id(records: list[dict[str, Any]]) -> str:
    highest = 0
    for record in records:
        match = _ID_PATTERN.match(str(record.get("incidentId", "")))
        if match:
            highest = max(highest, int(match.group(1)))
    return f"{ID_PREFIX}{highest + 1:04d}"


def list_incidents() -> list[Incident]:
    return [Incident.model_validate(record) for record in _store().load_all()]


def get_incident(incident_id: str) -> Incident:
    record = _store().get(incident_id)
    if record is None:
        raise NotFoundError(f"No incident found with ID '{incident_id}'.")
    return Incident.model_validate(record)


def _sort_key(field: str):
    if field == "severity":
        return lambda item: SEVERITY_RANK[item.severity]
    if field == "status":
        return lambda item: STATUS_RANK[item.status]
    if field in ("createdAt", "updatedAt"):
        # Records with an unparseable timestamp sort last rather than raising.
        return lambda item: getattr(item, field) or datetime.min.replace(tzinfo=timezone.utc)
    return lambda item: getattr(item, field)


def query_incidents(
    status: Status | None = None,
    severity: Severity | None = None,
    owner: str | None = None,
    service: str | None = None,
    q: str | None = None,
    sort_by: str = "createdAt",
    order: str = "desc",
) -> list[Incident]:
    results = list_incidents()

    if status is not None:
        results = [item for item in results if item.status is status]
    if severity is not None:
        results = [item for item in results if item.severity is severity]
    if owner:
        needle = owner.strip().casefold()
        results = [item for item in results if (item.owner or "").casefold() == needle]
    if service:
        needle = service.strip().casefold()
        results = [item for item in results if item.impactedService.casefold() == needle]
    if q and q.strip():
        needle = q.strip().casefold()
        results = [item for item in results if needle in item.title.casefold()]

    field = sort_by if sort_by in SORT_FIELDS else "createdAt"
    # Severity sorts P1-first by rank, so "descending severity" means least severe first.
    results.sort(key=_sort_key(field), reverse=order == "desc")
    return results


def distinct_owners() -> list[str]:
    return sorted({item.owner for item in list_incidents() if item.owner})


def distinct_services() -> list[str]:
    return sorted({item.impactedService for item in list_incidents()})


def create_incident(payload: IncidentCreate) -> Incident:
    store = _store()
    timestamp = now_utc()
    incident = Incident(
        incidentId=_next_incident_id(store.load_all()),
        title=payload.title,
        description=payload.description or "",
        severity=payload.severity,
        status=Status.OPEN,
        owner=payload.owner or None,
        impactedService=payload.impactedService,
        createdAt=timestamp,
        updatedAt=timestamp,
        timeline=[
            TimelineEntry(
                timestamp=timestamp,
                type="CREATED",
                message=(
                    f"Incident created with severity {payload.severity.value} "
                    f"for {payload.impactedService}."
                ),
            )
        ],
    )
    try:
        store.add(incident.model_dump(mode="json"))
    except ValueError as exc:
        raise DuplicateIncidentError(str(exc)) from exc
    return incident


def allowed_next_statuses(current: Status) -> list[Status]:
    return sorted(ALLOWED_TRANSITIONS.get(current, set()), key=lambda item: item.value)


def replace_incident(incident: Incident) -> Incident:
    """Persist an already-validated incident as-is."""
    try:
        _store().replace(incident.incidentId, incident.model_dump(mode="json"))
    except KeyError as exc:
        raise NotFoundError(f"No incident found with ID '{incident.incidentId}'.") from exc
    return incident


def record_escalation(incident_id: str, message: str) -> Incident:
    incident = get_incident(incident_id)
    incident.escalated = True
    incident.timeline.append(
        TimelineEntry(timestamp=now_utc(), type="ESCALATION", message=message)
    )
    _store().replace(incident_id, incident.model_dump(mode="json"))
    return incident


def clear_escalation(incident_id: str) -> Incident:
    """Clears the flag without a timeline entry so a later breach can escalate again."""
    incident = get_incident(incident_id)
    incident.escalated = False
    _store().replace(incident_id, incident.model_dump(mode="json"))
    return incident


def is_valid_transition(current: Status, target: Status) -> bool:
    """Staying in the same status is a no-op, not a transition."""
    if current == target:
        return True
    return target in ALLOWED_TRANSITIONS.get(current, set())


def _transition_error(current: Status, target: Status) -> InvalidTransitionError:
    allowed = allowed_next_statuses(current)
    prefix = f"Invalid status transition: {current.value} \u2192 {target.value}."
    if not allowed:
        return InvalidTransitionError(
            f"{prefix} {current.value} is a terminal status and cannot be changed."
        )
    return InvalidTransitionError(
        f"{prefix} Allowed from {current.value}: "
        f"{', '.join(item.value for item in allowed)}."
    )


def update_incident(incident_id: str, payload: IncidentUpdate) -> Incident:
    store = _store()
    incident = get_incident(incident_id)
    timestamp = now_utc()
    entries: list[TimelineEntry] = []

    if payload.status is not None and payload.status != incident.status:
        if not is_valid_transition(incident.status, payload.status):
            raise _transition_error(incident.status, payload.status)
        reopening = incident.status is Status.CLOSED and payload.status is Status.OPEN
        entries.append(
            TimelineEntry(
                timestamp=timestamp,
                type="REOPENED" if reopening else "STATUS_CHANGED",
                message=(
                    "Incident reopened: status changed from CLOSED to OPEN."
                    if reopening
                    else (
                        f"Status changed from {incident.status.value} "
                        f"to {payload.status.value}."
                    )
                ),
            )
        )
        incident.status = payload.status
        incident.resolvedAt = timestamp if payload.status is Status.CLOSED else None
        if reopening:
            # Drop the pre-closure flag so a fresh breach escalates again.
            incident.escalated = False

    if payload.owner is not None and payload.owner != (incident.owner or ""):
        previous = incident.owner or "Unassigned"
        new_owner = payload.owner or None
        entries.append(
            TimelineEntry(
                timestamp=timestamp,
                type="OWNER_CHANGED",
                message=f"Owner changed from {previous} to {new_owner or 'Unassigned'}.",
            )
        )
        incident.owner = new_owner

    if payload.severity is not None and payload.severity != incident.severity:
        entries.append(
            TimelineEntry(
                timestamp=timestamp,
                type="SEVERITY_CHANGED",
                message=(
                    f"Severity changed from {incident.severity.value} "
                    f"to {payload.severity.value}."
                ),
            )
        )
        incident.severity = payload.severity

    if payload.impactedService and payload.impactedService != incident.impactedService:
        entries.append(
            TimelineEntry(
                timestamp=timestamp,
                type="SERVICE_CHANGED",
                message=(
                    f"Impacted service changed from {incident.impactedService} "
                    f"to {payload.impactedService}."
                ),
            )
        )
        incident.impactedService = payload.impactedService

    if payload.title and payload.title != incident.title:
        entries.append(
            TimelineEntry(timestamp=timestamp, type="TITLE_CHANGED", message="Title updated.")
        )
        incident.title = payload.title

    if payload.description is not None and payload.description != incident.description:
        entries.append(
            TimelineEntry(
                timestamp=timestamp, type="DESCRIPTION_CHANGED", message="Description updated."
            )
        )
        incident.description = payload.description

    if not entries:
        return incident

    incident.timeline.extend(entries)
    incident.updatedAt = timestamp
    store.replace(incident_id, incident.model_dump(mode="json"))
    return incident
