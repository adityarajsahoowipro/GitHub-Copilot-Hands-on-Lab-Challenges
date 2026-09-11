"""SLA monitoring API."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.errors import NotFoundError
from app.services import incidents as incident_service
from app.services import sla as sla_service

router = APIRouter(prefix="/api/sla", tags=["sla"])


def _serialise(incident, info) -> dict[str, Any]:
    return {
        "incidentId": incident.incidentId,
        "title": incident.title,
        "severity": incident.severity.value,
        "status": incident.status.value,
        "owner": incident.owner,
        "slaStatus": info.status.value,
        "slaLabel": info.label,
        "targetHours": info.targetHours,
        "deadline": info.deadline.isoformat() if info.deadline else None,
        "elapsed": sla_service.format_duration(info.elapsed),
        "remaining": sla_service.format_duration(info.remaining),
        "percentRemaining": info.percentRemaining,
        "escalated": incident.escalated,
        "recommendation": info.recommendation,
        "warning": info.warning,
    }


@router.get("")
def list_sla() -> list[dict[str, Any]]:
    pairs = sla_service.with_sla(incident_service.list_incidents())
    return [_serialise(incident, info) for incident, info in pairs]


@router.get("/{incident_id}")
def incident_sla(incident_id: str) -> dict[str, Any]:
    try:
        incident = incident_service.get_incident(incident_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    incident = sla_service.check_and_escalate(incident)
    return _serialise(incident, sla_service.compute_sla(incident))
