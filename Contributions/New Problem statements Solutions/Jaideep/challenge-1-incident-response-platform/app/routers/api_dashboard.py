"""Dashboard metrics API."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.services import incidents as incident_service
from app.services import sla as sla_service
from app.services.dashboard import add_sla_metrics, compute_metrics

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
def dashboard_metrics() -> dict[str, Any]:
    pairs = sla_service.with_sla(incident_service.list_incidents())
    metrics = add_sla_metrics(compute_metrics([incident for incident, _ in pairs]), pairs)
    metrics["breached"] = [incident.incidentId for incident, _ in metrics["breached"]]
    return metrics
