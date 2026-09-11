"""JSON API for incidents."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.errors import (
    DuplicateIncidentError,
    InvalidTransitionError,
    NotFoundError,
    ValidationError,
)
from app.models import (
    Incident,
    IncidentCreate,
    IncidentLinkCreate,
    IncidentUpdate,
    RelatedMatch,
    SLAStatus,
    Severity,
    Status,
)
from app.services import incidents as incident_service
from app.services import related as related_service
from app.services import sla as sla_service

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.post("", response_model=Incident, status_code=status.HTTP_201_CREATED)
def create_incident(payload: IncidentCreate) -> Incident:
    try:
        return incident_service.create_incident(payload)
    except DuplicateIncidentError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("", response_model=list[Incident])
def list_incidents(
    status_filter: Status | None = Query(default=None, alias="status"),
    severity: Severity | None = None,
    owner: str | None = None,
    service: str | None = None,
    q: str | None = None,
    sla: SLAStatus | None = None,
    sort_by: str = "createdAt",
    order: str = "desc",
) -> list[Incident]:
    results = incident_service.query_incidents(
        status=status_filter,
        severity=severity,
        owner=owner,
        service=service,
        q=q,
        sort_by=sort_by,
        order=order,
    )
    if sla is None:
        return results
    return [
        incident
        for incident, info in sla_service.with_sla(results)
        if info.status is sla
    ]


@router.get("/{incident_id}", response_model=Incident)
def get_incident(incident_id: str) -> Incident:
    try:
        return incident_service.get_incident(incident_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{incident_id}", response_model=Incident)
def update_incident(incident_id: str, payload: IncidentUpdate) -> Incident:
    try:
        return incident_service.update_incident(incident_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{incident_id}/related", response_model=list[RelatedMatch])
def related_incidents(
    incident_id: str,
    limit: int = Query(default=related_service.MAX_SUGGESTIONS, ge=1, le=50),
) -> list[RelatedMatch]:
    try:
        return related_service.find_related(incident_id, limit=limit)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{incident_id}/links", response_model=list[Incident])
def list_links(incident_id: str) -> list[Incident]:
    try:
        return related_service.list_links(incident_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/{incident_id}/links", response_model=Incident, status_code=status.HTTP_201_CREATED)
def create_link(incident_id: str, payload: IncidentLinkCreate) -> Incident:
    try:
        return related_service.link_incidents(incident_id, payload.relatedIncidentId)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
