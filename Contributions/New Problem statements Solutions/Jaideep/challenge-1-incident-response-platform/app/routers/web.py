"""Server-rendered HTML routes."""

from __future__ import annotations

from fastapi import APIRouter, Form, Query, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import ValidationError

from app.errors import DomainError, NotFoundError
from app.models import (
    Incident,
    IncidentCreate,
    IncidentUpdate,
    RCAUpdate,
    SLAStatus,
    Severity,
    Status,
)
from app.services import incidents as incident_service
from app.services import rca as rca_service
from app.services import related as related_service
from app.services import sla as sla_service
from app.services.dashboard import (
    DONUT_CIRCUMFERENCE,
    add_sla_metrics,
    build_donut,
    compute_metrics,
)
from app.templating import templates

router = APIRouter(tags=["web"])

FIELD_LABELS = {
    "title": "Incident title",
    "severity": "Severity",
    "impactedService": "Impacted service",
    "description": "Description",
    "owner": "Owner",
}


def _readable_errors(exc: ValidationError) -> list[str]:
    messages: list[str] = []
    for error in exc.errors():
        field = str(error["loc"][0]) if error["loc"] else ""
        message = error["msg"]
        if message.startswith("Value error, "):
            message = message.removeprefix("Value error, ")
        elif field == "severity":
            message = "Severity must be selected (P1, P2 or P3)."
        else:
            message = f"{FIELD_LABELS.get(field, field)}: {message}"
        messages.append(message)
    return messages


def _not_found(request: Request, message: str) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "not_found.html",
        {"title": "Not found", "message": message},
        status_code=status.HTTP_404_NOT_FOUND,
    )


def _render_detail(
    request: Request,
    incident: Incident,
    errors: list[str] | None = None,
    status_code: int = status.HTTP_200_OK,
    notice: str | None = None,
) -> HTMLResponse:
    incident = sla_service.check_and_escalate(incident)
    return templates.TemplateResponse(
        request,
        "incident_detail.html",
        {
            "title": incident.incidentId,
            "incident": incident,
            "sla": sla_service.compute_sla(incident),
            "severities": list(Severity),
            "next_statuses": incident_service.allowed_next_statuses(incident.status),
            "related": related_service.find_related(incident.incidentId),
            "links": related_service.list_links(incident.incidentId),
            "errors": errors or [],
            "notice": notice,
        },
        status_code=status_code,
    )


@router.get("/", response_class=HTMLResponse)
def landing(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "landing.html", {"title": "Home"})


@router.get("/incidents", response_class=HTMLResponse)
def incident_list(
    request: Request,
    status_filter: Status | None = Query(default=None, alias="status"),
    severity: Severity | None = None,
    owner: str | None = None,
    service: str | None = None,
    q: str | None = None,
    sla: SLAStatus | None = None,
    sort_by: str = "createdAt",
    order: str = "desc",
) -> HTMLResponse:
    incidents = incident_service.query_incidents(
        status=status_filter,
        severity=severity,
        owner=owner,
        service=service,
        q=q,
        sort_by=sort_by,
        order=order,
    )
    pairs = sla_service.with_sla(incidents)
    if sla is not None:
        pairs = [pair for pair in pairs if pair[1].status is sla]
    return templates.TemplateResponse(
        request,
        "incident_list.html",
        {
            "title": "Incidents",
            "pairs": pairs,
            "statuses": list(Status),
            "severities": list(Severity),
            "sla_statuses": list(SLAStatus),
            "owners": incident_service.distinct_owners(),
            "services": incident_service.distinct_services(),
            "filters": {
                "status": status_filter.value if status_filter else "",
                "severity": severity.value if severity else "",
                "owner": owner or "",
                "service": service or "",
                "q": q or "",
                "sla": sla.value if sla else "",
                "sort_by": sort_by,
                "order": order,
            },
            "total_count": len(incident_service.list_incidents()),
        },
    )


@router.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request) -> HTMLResponse:
    pairs = sla_service.with_sla(incident_service.list_incidents())
    metrics = add_sla_metrics(compute_metrics([incident for incident, _ in pairs]), pairs)
    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "title": "Dashboard",
            "metrics": metrics,
            "donut": build_donut(metrics),
            "statuses": list(Status),
            "severities": list(Severity),
            "sla_statuses": list(SLAStatus),
            "circumference": round(DONUT_CIRCUMFERENCE, 2),
        },
    )


# Declared before /incidents/{incident_id} so "new" is not captured as an ID.
@router.get("/incidents/new", response_class=HTMLResponse)
def incident_new_form(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "incident_form.html",
        {"title": "New incident", "severities": list(Severity), "form": {}, "errors": []},
    )


@router.post("/incidents/new", response_class=HTMLResponse)
def incident_create(
    request: Request,
    title: str = Form(default=""),
    description: str = Form(default=""),
    severity: str = Form(default=""),
    impactedService: str = Form(default=""),
    owner: str = Form(default=""),
):
    submitted = {
        "title": title,
        "description": description,
        "severity": severity,
        "impactedService": impactedService,
        "owner": owner,
    }
    try:
        payload = IncidentCreate(**submitted)
        incident = incident_service.create_incident(payload)
    except ValidationError as exc:
        errors = _readable_errors(exc)
    except DomainError as exc:
        errors = [str(exc)]
    else:
        return RedirectResponse(
            url=f"/incidents/{incident.incidentId}", status_code=status.HTTP_303_SEE_OTHER
        )

    return templates.TemplateResponse(
        request,
        "incident_form.html",
        {
            "title": "New incident",
            "severities": list(Severity),
            "form": submitted,
            "errors": errors,
        },
        status_code=status.HTTP_400_BAD_REQUEST,
    )


@router.get("/incidents/{incident_id}", response_class=HTMLResponse)
def incident_detail(request: Request, incident_id: str, linked: str = "") -> HTMLResponse:
    try:
        incident = incident_service.get_incident(incident_id)
    except NotFoundError as exc:
        return _not_found(request, str(exc))
    notice = f"Linked to {linked}." if linked else None
    return _render_detail(request, incident, notice=notice)


@router.post("/incidents/{incident_id}/link", response_class=HTMLResponse)
def incident_link(
    request: Request,
    incident_id: str,
    relatedIncidentId: str = Form(default=""),
):
    try:
        incident = incident_service.get_incident(incident_id)
    except NotFoundError as exc:
        return _not_found(request, str(exc))

    try:
        related_service.link_incidents(incident_id, relatedIncidentId.strip())
    except DomainError as exc:
        return _render_detail(
            request,
            incident,
            errors=[str(exc)],
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    return RedirectResponse(
        url=f"/incidents/{incident_id}?linked={relatedIncidentId.strip()}",
        status_code=status.HTTP_303_SEE_OTHER,
    )


@router.post("/incidents/{incident_id}/update", response_class=HTMLResponse)
def incident_update(
    request: Request,
    incident_id: str,
    status_value: str = Form(default="", alias="status"),
    severity: str = Form(default=""),
    impactedService: str = Form(default=""),
    owner: str = Form(default=""),
):
    try:
        payload = IncidentUpdate(
            status=status_value or None,
            severity=severity or None,
            impactedService=impactedService or None,
            owner=owner,
        )
        incident_service.update_incident(incident_id, payload)
    except NotFoundError as exc:
        return _not_found(request, str(exc))
    except ValidationError as exc:
        errors = _readable_errors(exc)
    except DomainError as exc:
        errors = [str(exc)]
    else:
        return RedirectResponse(
            url=f"/incidents/{incident_id}", status_code=status.HTTP_303_SEE_OTHER
        )

    return _render_detail(
        request,
        incident_service.get_incident(incident_id),
        errors=errors,
        status_code=status.HTTP_400_BAD_REQUEST,
    )


def _lines(value: str) -> list[str]:
    return [line.strip() for line in value.splitlines() if line.strip()]


def _render_rca(request: Request, incident_id: str, notice: str | None = None) -> HTMLResponse:
    incident = incident_service.get_incident(incident_id)
    report = warnings = None
    if rca_service.has_rca(incident_id):
        report, warnings = rca_service.get_rca(incident_id)
    else:
        warnings = rca_service.build_warnings(incident)
    return templates.TemplateResponse(
        request,
        "rca.html",
        {
            "title": f"RCA {incident_id}",
            "incident": incident,
            "report": report,
            "warnings": warnings,
            "notice": notice,
        },
    )


@router.get("/incidents/{incident_id}/rca", response_class=HTMLResponse)
def rca_page(request: Request, incident_id: str, saved: int = 0) -> HTMLResponse:
    try:
        return _render_rca(request, incident_id, notice="RCA saved." if saved else None)
    except NotFoundError as exc:
        return _not_found(request, str(exc))


@router.post("/incidents/{incident_id}/rca/generate", response_class=HTMLResponse)
def rca_generate(request: Request, incident_id: str):
    try:
        rca_service.generate_rca(incident_id)
    except NotFoundError as exc:
        return _not_found(request, str(exc))
    return RedirectResponse(
        url=f"/incidents/{incident_id}/rca", status_code=status.HTTP_303_SEE_OTHER
    )


@router.post("/incidents/{incident_id}/rca", response_class=HTMLResponse)
def rca_save(
    request: Request,
    incident_id: str,
    incidentSummary: str = Form(default=""),
    rootCause: str = Form(default=""),
    impactedServices: str = Form(default=""),
    resolution: str = Form(default=""),
    lessonsLearned: str = Form(default=""),
    recommendations: str = Form(default=""),
):
    try:
        rca_service.update_rca(
            incident_id,
            RCAUpdate(
                incidentSummary=incidentSummary,
                rootCause=rootCause,
                impactedServices=_lines(impactedServices),
                resolution=resolution,
                lessonsLearned=lessonsLearned,
                recommendations=_lines(recommendations),
            ),
        )
    except NotFoundError as exc:
        return _not_found(request, str(exc))
    return RedirectResponse(
        url=f"/incidents/{incident_id}/rca?saved=1", status_code=status.HTTP_303_SEE_OTHER
    )
