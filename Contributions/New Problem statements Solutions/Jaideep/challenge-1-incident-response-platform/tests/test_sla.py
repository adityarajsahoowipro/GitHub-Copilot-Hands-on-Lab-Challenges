from datetime import datetime, timedelta, timezone

import pytest

from app.models import Incident, SLAStatus, Severity, Status
from app.services.sla import (
    APPROACHING_THRESHOLD,
    SLA_HOURS,
    check_and_escalate,
    compute_sla,
    format_duration,
)

NOW = datetime(2026, 9, 9, 12, 0, tzinfo=timezone.utc)


def make(severity="P1", status="OPEN", created=None, resolved=None, escalated=False):
    return Incident(
        incidentId="INC-0001",
        title="Checkout outage",
        severity=Severity(severity),
        status=Status(status),
        impactedService="Checkout Service",
        createdAt=created if created is not None else NOW,
        resolvedAt=resolved,
        escalated=escalated,
    )


def created_ago(**kwargs):
    return NOW - timedelta(**kwargs)


# --- targets --------------------------------------------------------------


def test_sla_targets_match_spec():
    assert SLA_HOURS[Severity.P1] == 2
    assert SLA_HOURS[Severity.P2] == 4
    assert SLA_HOURS[Severity.P3] == 8


@pytest.mark.parametrize("severity, hours", [("P1", 2), ("P2", 4), ("P3", 8)])
def test_deadline_is_created_plus_target(severity, hours):
    incident = make(severity=severity, created=NOW)
    info = compute_sla(incident, now=NOW)
    assert info.deadline == NOW + timedelta(hours=hours)
    assert info.targetHours == hours


# --- one case per status --------------------------------------------------


def test_within_sla():
    info = compute_sla(make(severity="P1", created=created_ago(minutes=30)), now=NOW)
    assert info.status is SLAStatus.WITHIN_SLA


def test_approaching_sla():
    # P1 target is 2h; 1h40m elapsed leaves 20m = 16.7% remaining.
    info = compute_sla(make(severity="P1", created=created_ago(minutes=100)), now=NOW)
    assert info.status is SLAStatus.APPROACHING_SLA


def test_sla_breached():
    info = compute_sla(make(severity="P1", created=created_ago(hours=3)), now=NOW)
    assert info.status is SLAStatus.SLA_BREACHED


def test_not_applicable_when_closed():
    incident = make(status="CLOSED", created=created_ago(hours=1), resolved=NOW)
    assert compute_sla(incident, now=NOW).status is SLAStatus.NOT_APPLICABLE


# --- 25% boundary ---------------------------------------------------------


def test_exactly_25_percent_remaining_is_approaching():
    # P2 target 4h; 3h elapsed leaves exactly 25%.
    info = compute_sla(make(severity="P2", created=created_ago(hours=3)), now=NOW)
    assert info.percentRemaining == 25.0
    assert info.status is SLAStatus.APPROACHING_SLA


def test_just_above_25_percent_is_within_sla():
    info = compute_sla(make(severity="P2", created=created_ago(minutes=179)), now=NOW)
    assert info.status is SLAStatus.WITHIN_SLA


def test_threshold_constant_is_25_percent():
    assert APPROACHING_THRESHOLD == 0.25


def test_exactly_at_deadline_is_breached():
    info = compute_sla(make(severity="P1", created=created_ago(hours=2)), now=NOW)
    assert info.remaining == timedelta(0)
    assert info.status is SLAStatus.SLA_BREACHED


# --- elapsed / remaining --------------------------------------------------


def test_elapsed_and_remaining_are_reported():
    info = compute_sla(make(severity="P2", created=created_ago(hours=1)), now=NOW)
    assert info.elapsed == timedelta(hours=1)
    assert info.remaining == timedelta(hours=3)
    assert info.percentRemaining == 75.0
    assert info.percentElapsed == 25.0


def test_percent_remaining_never_negative():
    info = compute_sla(make(severity="P1", created=created_ago(hours=10)), now=NOW)
    assert info.percentRemaining == 0.0


def test_format_duration():
    assert format_duration(timedelta(hours=2, minutes=5)) == "2h 05m"
    assert format_duration(timedelta(0)) == "0h 00m"
    assert format_duration(None) == "—"
    assert "overdue" in format_duration(timedelta(hours=-1))


# --- severity changed after creation --------------------------------------


def test_severity_upgrade_can_flip_to_breached():
    # 2h30m elapsed: 37.5% of a P2 4h target remains, but a P1 2h target is already past.
    created = created_ago(minutes=150)
    assert compute_sla(make(severity="P2", created=created), now=NOW).status is (
        SLAStatus.WITHIN_SLA
    )
    assert compute_sla(make(severity="P1", created=created), now=NOW).status is (
        SLAStatus.SLA_BREACHED
    )


def test_severity_downgrade_extends_deadline():
    created = created_ago(hours=3)
    assert compute_sla(make(severity="P1", created=created), now=NOW).is_breached
    assert not compute_sla(make(severity="P3", created=created), now=NOW).is_breached


def test_deadline_follows_current_severity_not_original():
    created = created_ago(hours=1)
    info = compute_sla(make(severity="P3", created=created), now=NOW)
    assert info.deadline == created + timedelta(hours=8)


# --- closed before deadline -----------------------------------------------


def test_closed_early_is_marked_resolved_within_sla():
    created = created_ago(hours=3)
    incident = make(severity="P2", status="CLOSED", created=created, resolved=created_ago(hours=2))
    info = compute_sla(incident, now=NOW)
    assert info.resolvedWithinSla is True
    assert info.label == "Resolved within SLA"


def test_closed_late_is_marked_resolved_after_deadline():
    created = created_ago(hours=10)
    incident = make(severity="P1", status="CLOSED", created=created, resolved=NOW)
    info = compute_sla(incident, now=NOW)
    assert info.status is SLAStatus.NOT_APPLICABLE
    assert info.resolvedWithinSla is False
    assert info.label == "Resolved after SLA deadline"


def test_closed_freezes_elapsed_at_resolution_not_now():
    created = created_ago(hours=6)
    resolved = created_ago(hours=5)
    incident = make(severity="P3", status="CLOSED", created=created, resolved=resolved)
    # Elapsed is 1h (created→resolved), not 6h (created→now).
    assert compute_sla(incident, now=NOW).elapsed == timedelta(hours=1)


def test_closed_status_takes_precedence_over_breach():
    incident = make(severity="P1", status="CLOSED", created=created_ago(days=5), resolved=NOW)
    assert compute_sla(incident, now=NOW).status is SLAStatus.NOT_APPLICABLE


# --- invalid or missing timestamps ----------------------------------------


def test_missing_created_at_is_not_applicable():
    incident = Incident.model_validate(
        {
            "incidentId": "INC-0001",
            "title": "No timestamp",
            "severity": "P1",
            "status": "OPEN",
            "impactedService": "Checkout Service",
            "createdAt": None,
        }
    )
    info = compute_sla(incident, now=NOW)
    assert info.status is SLAStatus.NOT_APPLICABLE
    assert info.warning is not None
    assert info.deadline is None


def test_corrupt_created_at_does_not_crash_loading():
    incident = Incident.model_validate(
        {
            "incidentId": "INC-0001",
            "title": "Bad timestamp",
            "severity": "P2",
            "status": "OPEN",
            "impactedService": "Checkout Service",
            "createdAt": "not-a-date",
        }
    )
    assert incident.createdAt is None
    assert compute_sla(incident, now=NOW).status is SLAStatus.NOT_APPLICABLE


def test_naive_timestamp_is_coerced_to_utc():
    """A naive datetime from an older file must not raise on aware/naive subtraction."""
    incident = Incident.model_validate(
        {
            "incidentId": "INC-0001",
            "title": "Naive timestamp",
            "severity": "P1",
            "status": "OPEN",
            "impactedService": "Checkout Service",
            "createdAt": "2026-09-09T10:00:00",
        }
    )
    assert incident.createdAt.tzinfo is not None
    assert compute_sla(incident, now=NOW).status is SLAStatus.SLA_BREACHED


def test_offset_timestamp_normalised_to_utc():
    incident = Incident.model_validate(
        {
            "incidentId": "INC-0001",
            "title": "Offset timestamp",
            "severity": "P1",
            "status": "OPEN",
            "impactedService": "Checkout Service",
            "createdAt": "2026-09-09T16:30:00+05:30",
        }
    )
    # 16:30+05:30 is 11:00 UTC, so 1h elapsed against a 2h target.
    assert compute_sla(incident, now=NOW).elapsed == timedelta(hours=1)


# --- reopen ---------------------------------------------------------------


def test_reopen_resumes_sla_tracking(client):
    incident_id = client.post(
        "/api/incidents",
        json={"title": "T", "severity": "P1", "impactedService": "S"},
    ).json()["incidentId"]
    for target in ("INVESTIGATING", "MITIGATED", "CLOSED"):
        client.patch(f"/api/incidents/{incident_id}", json={"status": target})
    assert client.get(f"/api/sla/{incident_id}").json()["slaStatus"] == "NOT_APPLICABLE"

    client.patch(f"/api/incidents/{incident_id}", json={"status": "OPEN"})

    body = client.get(f"/api/sla/{incident_id}").json()
    assert body["slaStatus"] == "WITHIN_SLA"
    assert body["slaLabel"] == "Within SLA"


def test_closed_only_reopens_to_open(client):
    incident_id = client.post(
        "/api/incidents",
        json={"title": "T", "severity": "P1", "impactedService": "S"},
    ).json()["incidentId"]
    for target in ("INVESTIGATING", "MITIGATED", "CLOSED"):
        client.patch(f"/api/incidents/{incident_id}", json={"status": target})

    for target in ("INVESTIGATING", "MITIGATED"):
        response = client.patch(f"/api/incidents/{incident_id}", json={"status": target})
        assert response.status_code == 400


# --- escalation -----------------------------------------------------------


def create_breached(client, severity="P1", hours_ago=5):
    """Create an incident then backdate it directly in the store."""
    from app.services.incidents import _store

    incident_id = client.post(
        "/api/incidents",
        json={"title": "Breached incident", "severity": severity, "impactedService": "Checkout"},
    ).json()["incidentId"]
    record = _store().get(incident_id)
    record["createdAt"] = (
        datetime.now(timezone.utc) - timedelta(hours=hours_ago)
    ).isoformat().replace("+00:00", "Z")
    _store().replace(incident_id, record)
    return incident_id


def test_breach_adds_escalation_entry(client):
    incident_id = create_breached(client)
    body = client.get(f"/api/sla/{incident_id}").json()
    assert body["slaStatus"] == "SLA_BREACHED"
    assert body["escalated"] is True

    timeline = client.get(f"/api/incidents/{incident_id}").json()["timeline"]
    assert [entry["type"] for entry in timeline].count("ESCALATION") == 1


def test_escalation_is_idempotent(client):
    incident_id = create_breached(client)
    for _ in range(5):
        client.get(f"/api/sla/{incident_id}")
        client.get("/api/sla")
        client.get("/dashboard")

    timeline = client.get(f"/api/incidents/{incident_id}").json()["timeline"]
    assert [entry["type"] for entry in timeline].count("ESCALATION") == 1


def test_escalation_message_names_severity_and_target(client):
    incident_id = create_breached(client, severity="P1")
    client.get(f"/api/sla/{incident_id}")
    timeline = client.get(f"/api/incidents/{incident_id}").json()["timeline"]
    entry = next(item for item in timeline if item["type"] == "ESCALATION")
    assert "P1" in entry["message"]
    assert "2h" in entry["message"]


def test_breach_surfaces_recommendation(client):
    incident_id = create_breached(client)
    body = client.get(f"/api/sla/{incident_id}").json()
    assert "reassign" in body["recommendation"].lower()


def test_within_sla_incident_is_not_escalated(client):
    incident_id = client.post(
        "/api/incidents",
        json={"title": "Fresh", "severity": "P3", "impactedService": "S"},
    ).json()["incidentId"]
    body = client.get(f"/api/sla/{incident_id}").json()
    assert body["slaStatus"] == "WITHIN_SLA"
    assert body["escalated"] is False

    timeline = client.get(f"/api/incidents/{incident_id}").json()["timeline"]
    assert not any(entry["type"] == "ESCALATION" for entry in timeline)


def test_severity_downgrade_clears_escalation_flag(client):
    incident_id = create_breached(client, severity="P1", hours_ago=5)
    assert client.get(f"/api/sla/{incident_id}").json()["escalated"] is True

    client.patch(f"/api/incidents/{incident_id}", json={"severity": "P3"})
    body = client.get(f"/api/sla/{incident_id}").json()
    assert body["slaStatus"] != "SLA_BREACHED"
    assert body["escalated"] is False


def test_re_breach_after_downgrade_adds_a_second_entry(client):
    incident_id = create_breached(client, severity="P1", hours_ago=5)
    client.get(f"/api/sla/{incident_id}")
    client.patch(f"/api/incidents/{incident_id}", json={"severity": "P3"})
    client.get(f"/api/sla/{incident_id}")
    client.patch(f"/api/incidents/{incident_id}", json={"severity": "P1"})
    client.get(f"/api/sla/{incident_id}")

    timeline = client.get(f"/api/incidents/{incident_id}").json()["timeline"]
    assert [entry["type"] for entry in timeline].count("ESCALATION") == 2


def test_closing_a_breached_incident_stops_escalation(client):
    incident_id = create_breached(client)
    client.get(f"/api/sla/{incident_id}")
    for target in ("INVESTIGATING", "MITIGATED", "CLOSED"):
        client.patch(f"/api/incidents/{incident_id}", json={"status": target})

    body = client.get(f"/api/sla/{incident_id}").json()
    assert body["slaStatus"] == "NOT_APPLICABLE"
    timeline = client.get(f"/api/incidents/{incident_id}").json()["timeline"]
    assert [entry["type"] for entry in timeline].count("ESCALATION") == 1


# --- API and dashboard ----------------------------------------------------


def test_sla_api_lists_every_incident(client):
    for index in range(3):
        client.post(
            "/api/incidents",
            json={"title": f"T{index}", "severity": "P2", "impactedService": "S"},
        )
    assert len(client.get("/api/sla").json()) == 3


def test_sla_api_unknown_incident_404(client):
    assert client.get("/api/sla/INC-9999").status_code == 404


def test_dashboard_counts_sla_buckets(client):
    create_breached(client)
    client.post("/api/incidents", json={"title": "Fresh", "severity": "P3", "impactedService": "S"})
    metrics = client.get("/api/dashboard").json()
    assert metrics["bySla"]["SLA_BREACHED"] == 1
    assert metrics["bySla"]["WITHIN_SLA"] == 1
    assert metrics["breached"] == ["INC-0001"]


def test_filter_by_sla_status(client):
    create_breached(client)
    client.post("/api/incidents", json={"title": "Fresh", "severity": "P3", "impactedService": "S"})
    breached = client.get("/api/incidents?sla=SLA_BREACHED").json()
    assert [item["incidentId"] for item in breached] == ["INC-0001"]
    assert len(client.get("/api/incidents?sla=WITHIN_SLA").json()) == 1


def test_invalid_sla_filter_returns_422(client):
    assert client.get("/api/incidents?sla=NOPE").status_code == 422


# --- web pages ------------------------------------------------------------


def test_dashboard_shows_breach_banner(client):
    create_breached(client)
    page = client.get("/dashboard").text
    assert "breached the SLA" in page
    assert "immediate attention required" in page
    assert "INC-0001" in page


def test_dashboard_hides_banner_when_no_breach(client):
    client.post("/api/incidents", json={"title": "Fresh", "severity": "P3", "impactedService": "S"})
    assert "breached the SLA" not in client.get("/dashboard").text


def test_dashboard_shows_sla_cards(client):
    client.post("/api/incidents", json={"title": "Fresh", "severity": "P3", "impactedService": "S"})
    page = client.get("/dashboard").text
    assert "SLA monitoring" in page
    assert "sla-WITHIN_SLA" in page


def test_list_page_shows_sla_badge_and_highlights_breach(client):
    create_breached(client)
    page = client.get("/incidents").text
    assert "sla-SLA_BREACHED" in page
    assert "row-alert" in page


def test_list_page_sla_filter(client):
    create_breached(client)
    client.post("/api/incidents", json={"title": "Fresh", "severity": "P3", "impactedService": "S"})
    page = client.get("/incidents?sla=SLA_BREACHED").text
    assert "Showing 1 of 2 incidents." in page


def test_detail_page_shows_sla_panel(client):
    create_breached(client)
    page = client.get("/incidents/INC-0001").text
    assert "SLA (2h target for P1)" in page
    assert "Time elapsed" in page
    assert "Time remaining" in page
    assert "Deadline" in page
    assert "SLA breached" in page


def test_detail_page_shows_escalation_in_timeline(client):
    create_breached(client)
    page = client.get("/incidents/INC-0001").text
    assert "ESCALATION" in page
