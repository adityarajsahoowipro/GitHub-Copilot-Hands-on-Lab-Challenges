"""Root Cause Analysis API."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.errors import NotFoundError
from app.models import RCAResponse, RCAUpdate
from app.services import rca as rca_service

router = APIRouter(prefix="/api/incidents/{incident_id}/rca", tags=["rca"])


@router.post("", response_model=RCAResponse, status_code=status.HTTP_201_CREATED)
def generate_rca(incident_id: str) -> RCAResponse:
    try:
        report, warnings = rca_service.generate_rca(incident_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return RCAResponse(report=report, warnings=warnings)


@router.get("", response_model=RCAResponse)
def get_rca(incident_id: str) -> RCAResponse:
    try:
        report, warnings = rca_service.get_rca(incident_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return RCAResponse(report=report, warnings=warnings)


@router.put("", response_model=RCAResponse)
def update_rca(incident_id: str, payload: RCAUpdate) -> RCAResponse:
    try:
        report, warnings = rca_service.update_rca(incident_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return RCAResponse(report=report, warnings=warnings)
