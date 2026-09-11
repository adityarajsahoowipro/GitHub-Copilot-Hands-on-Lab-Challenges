"""Dashboard metrics. compute_metrics is pure so it always reflects the data passed in."""

from __future__ import annotations

import math
from typing import Any

from app.models import Incident, SLAStatus, Severity, Status

STATUS_ORDER = [Status.OPEN, Status.INVESTIGATING, Status.MITIGATED, Status.CLOSED]
SEVERITY_ORDER = [Severity.P1, Severity.P2, Severity.P3]

DONUT_RADIUS = 70
DONUT_CIRCUMFERENCE = 2 * math.pi * DONUT_RADIUS


def _percentage(count: int, total: int) -> float:
    return round(count / total * 100, 1) if total else 0.0


def compute_metrics(incidents: list[Incident]) -> dict[str, Any]:
    total = len(incidents)
    by_status = {item.value: 0 for item in STATUS_ORDER}
    by_severity = {item.value: 0 for item in SEVERITY_ORDER}

    for incident in incidents:
        by_status[incident.status.value] += 1
        by_severity[incident.severity.value] += 1

    active = total - by_status[Status.CLOSED.value]
    return {
        "total": total,
        "active": active,
        "byStatus": by_status,
        "bySeverity": by_severity,
        "statusPercentages": {key: _percentage(value, total) for key, value in by_status.items()},
        "severityPercentages": {
            key: _percentage(value, total) for key, value in by_severity.items()
        },
        "resolutionRate": _percentage(by_status[Status.CLOSED.value], total),
        "bySla": {item.value: 0 for item in SLAStatus},
    }


def add_sla_metrics(metrics: dict[str, Any], pairs: list[tuple]) -> dict[str, Any]:
    counts = {item.value: 0 for item in SLAStatus}
    for _, info in pairs:
        counts[info.status.value] += 1
    metrics["bySla"] = counts
    metrics["breached"] = [
        (incident, info) for incident, info in pairs if info.is_breached
    ]
    return metrics


def build_donut(metrics: dict[str, Any]) -> list[dict[str, Any]]:
    """Stroke-dasharray segments for the severity donut; empty when there is no data."""
    if not metrics["total"]:
        return []

    segments = []
    consumed = 0.0
    for severity in SEVERITY_ORDER:
        count = metrics["bySeverity"][severity.value]
        if not count:
            continue
        length = count / metrics["total"] * DONUT_CIRCUMFERENCE
        segments.append(
            {
                "severity": severity.value,
                "label": severity.label,
                "count": count,
                "percent": metrics["severityPercentages"][severity.value],
                "dash": round(length, 2),
                "gap": round(DONUT_CIRCUMFERENCE - length, 2),
                "offset": round(-consumed, 2),
            }
        )
        consumed += length
    return segments
