"""Rule-based Root Cause Analysis generation. No external model or service involved."""

from __future__ import annotations

from app.config import ensure_data_files, get_rca_file
from app.errors import NotFoundError
from app.models import Incident, RCAReport, RCAUpdate, Severity, Status
from app.services import incidents as incident_service
from app.storage import JsonStore, get_store
from app.utils.time import format_display, now_utc

RESOLVED_STATUSES = (Status.MITIGATED, Status.CLOSED)

SEVERITY_RECOMMENDATIONS: dict[Severity, list[str]] = {
    Severity.P1: [
        "Hold a blameless postmortem review within 48 hours",
        "Add alerting on the leading indicators that preceded this failure",
        "Update the on-call runbook with the mitigation steps used here",
        "Review retry, timeout and circuit-breaker settings on the affected path",
    ],
    Severity.P2: [
        "Add monitoring for the affected component",
        "Configure early-warning alerts before user impact occurs",
        "Review capacity and scaling thresholds for this service",
    ],
    Severity.P3: [
        "Track a follow-up task to address the underlying weakness",
        "Confirm existing dashboards surface this class of degradation",
    ],
}

SEVERITY_IMPACT = {
    Severity.P1: "critical, customer-facing impact",
    Severity.P2: "significant degradation with partial user impact",
    Severity.P3: "limited impact contained to a single service",
}

STATUS_RESOLUTION = {
    Status.OPEN: "No resolution has been recorded. The incident has not been triaged yet.",
    Status.INVESTIGATING: (
        "Investigation is in progress. No mitigation has been applied at the time of writing."
    ),
    Status.MITIGATED: (
        "A mitigation has been applied and impact has stopped. "
        "A permanent fix is still outstanding."
    ),
    Status.CLOSED: "The incident was mitigated and formally closed.",
}

STATUS_LESSONS = {
    Status.OPEN: "Not yet available — capture lessons learned once the incident is resolved.",
    Status.INVESTIGATING: (
        "Not yet available — capture lessons learned once the incident is resolved."
    ),
    Status.MITIGATED: (
        "Existing monitoring did not provide an early warning before users were affected."
    ),
    Status.CLOSED: (
        "Existing monitoring did not provide an early warning before users were affected. "
        "Detection relied on manual reporting rather than automated alerts."
    ),
}


def _store() -> JsonStore:
    ensure_data_files()
    return get_store(get_rca_file(), "incidentId")


def build_warnings(incident: Incident) -> list[str]:
    warnings: list[str] = []
    if incident.status not in RESOLVED_STATUSES:
        warnings.append(
            f"Root cause cannot be inferred — incident is still {incident.status.value}. "
            "The generated root cause is provisional and should be edited."
        )
    if not incident.description.strip():
        warnings.append(
            "Incident description is empty — the summary and root cause could not be "
            "pre-filled from incident data."
        )
    if not incident.owner:
        warnings.append("No owner is assigned to this incident.")
    return warnings


def _summary(incident: Incident) -> str:
    detail = (
        f" Reported symptoms: {incident.description.strip()}"
        if incident.description.strip()
        else " No description was provided when the incident was raised."
    )
    return (
        f"{incident.title} affected {incident.impactedService} and was raised as a "
        f"{incident.severity.value} ({incident.severity.label}) incident on "
        f"{format_display(incident.createdAt)}, indicating "
        f"{SEVERITY_IMPACT[incident.severity]}.{detail}"
    )


def _root_cause(incident: Incident) -> str:
    if incident.status not in RESOLVED_STATUSES:
        return (
            "Root cause has not been established. The incident is still "
            f"{incident.status.value} and under active investigation."
        )
    if not incident.description.strip():
        return (
            "Root cause could not be derived automatically because the incident has no "
            "description. Record the contributing factors here."
        )
    return (
        f"Based on the reported behaviour of {incident.impactedService} "
        f"({incident.description.strip()}), the failure originated within this service "
        "or one of its direct dependencies. Confirm and replace with the verified cause."
    )


def _resolution(incident: Incident) -> str:
    text = STATUS_RESOLUTION[incident.status]
    if incident.resolvedAt:
        text += f" Closed at {format_display(incident.resolvedAt)}."
    return text


def build_report(incident: Incident, generated_at=None) -> RCAReport:
    timestamp = now_utc()
    return RCAReport(
        incidentId=incident.incidentId,
        incidentSummary=_summary(incident),
        rootCause=_root_cause(incident),
        impactedServices=[incident.impactedService],
        resolution=_resolution(incident),
        lessonsLearned=STATUS_LESSONS[incident.status],
        recommendations=list(SEVERITY_RECOMMENDATIONS[incident.severity]),
        generatedAt=generated_at or timestamp,
        updatedAt=timestamp,
    )


def generate_rca(incident_id: str) -> tuple[RCAReport, list[str]]:
    """Regenerating overwrites the content but keeps the original generatedAt."""
    incident = _load_incident(incident_id)
    store = _store()
    existing = store.get(incident_id)
    previous_generated_at = None
    if existing is not None:
        previous_generated_at = RCAReport.model_validate(existing).generatedAt

    report = build_report(incident, generated_at=previous_generated_at)
    payload = report.model_dump(mode="json")
    if existing is None:
        store.add(payload)
    else:
        store.replace(incident_id, payload)
    return report, build_warnings(incident)


def get_rca(incident_id: str) -> tuple[RCAReport, list[str]]:
    incident = _load_incident(incident_id)
    record = _store().get(incident_id)
    if record is None:
        raise NotFoundError(
            f"No RCA report exists for incident '{incident_id}'. Generate one first."
        )
    return RCAReport.model_validate(record), build_warnings(incident)


def update_rca(incident_id: str, payload: RCAUpdate) -> tuple[RCAReport, list[str]]:
    report, warnings = get_rca(incident_id)
    changes = payload.model_dump(exclude_none=True)
    if changes:
        report = report.model_copy(update={**changes, "updatedAt": now_utc()})
        _store().replace(incident_id, report.model_dump(mode="json"))
    return report, warnings


def has_rca(incident_id: str) -> bool:
    return _store().get(incident_id) is not None


def _load_incident(incident_id: str) -> Incident:
    try:
        return incident_service.get_incident(incident_id)
    except NotFoundError as exc:
        raise NotFoundError(
            f"No incident found with ID '{incident_id}'. Cannot generate RCA."
        ) from exc
