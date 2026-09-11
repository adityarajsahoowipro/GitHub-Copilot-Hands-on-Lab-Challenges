import pytest

from app.models import Incident, Severity, Status
from app.services.dashboard import DONUT_CIRCUMFERENCE, build_donut, compute_metrics
from app.services.incidents import SEVERITY_RANK


def make(severity="P2", status="OPEN", title="Incident", owner=None, service="Checkout Service"):
    return Incident(
        incidentId="INC-0001",
        title=title,
        severity=Severity(severity),
        status=Status(status),
        owner=owner,
        impactedService=service,
    )


def seed(client):
    """Six incidents: 2xP1, 3xP2, 1xP3 across every status."""
    specs = [
        ("Checkout outage", "P1", "Checkout Service", "Priya", []),
        ("Payment failures", "P1", "Payment Service", "Arun", ["INVESTIGATING"]),
        ("Order latency", "P2", "Order Service", "Priya", ["INVESTIGATING", "MITIGATED"]),
        ("Search slow", "P2", "Search Service", None, []),
        ("Cart errors", "P2", "Cart Service", "Arun", ["INVESTIGATING", "MITIGATED", "CLOSED"]),
        ("Login delay", "P3", "Auth Service", None, []),
    ]
    for title, severity, service, owner, path in specs:
        body = {"title": title, "severity": severity, "impactedService": service}
        if owner:
            body["owner"] = owner
        incident_id = client.post("/api/incidents", json=body).json()["incidentId"]
        for target in path:
            client.patch(f"/api/incidents/{incident_id}", json={"status": target})


# --- compute_metrics (pure) ----------------------------------------------


def test_metrics_of_empty_list():
    metrics = compute_metrics([])
    assert metrics["total"] == 0
    assert metrics["active"] == 0
    assert metrics["byStatus"] == {"OPEN": 0, "INVESTIGATING": 0, "MITIGATED": 0, "CLOSED": 0}
    assert metrics["bySeverity"] == {"P1": 0, "P2": 0, "P3": 0}


def test_empty_percentages_do_not_divide_by_zero():
    metrics = compute_metrics([])
    assert set(metrics["statusPercentages"].values()) == {0.0}
    assert set(metrics["severityPercentages"].values()) == {0.0}
    assert metrics["resolutionRate"] == 0.0


def test_counts_by_status_and_severity():
    incidents = [
        make(severity="P1"),
        make(severity="P1", status="INVESTIGATING"),
        make(severity="P2", status="CLOSED"),
        make(severity="P3", status="MITIGATED"),
    ]
    metrics = compute_metrics(incidents)
    assert metrics["total"] == 4
    assert metrics["byStatus"] == {"OPEN": 1, "INVESTIGATING": 1, "MITIGATED": 1, "CLOSED": 1}
    assert metrics["bySeverity"] == {"P1": 2, "P2": 1, "P3": 1}


def test_active_excludes_closed():
    incidents = [make(), make(status="CLOSED"), make(status="CLOSED")]
    assert compute_metrics(incidents)["active"] == 1


def test_percentages_sum_to_100():
    incidents = [make(severity="P1"), make(severity="P2"), make(severity="P3"), make()]
    metrics = compute_metrics(incidents)
    assert sum(metrics["statusPercentages"].values()) == pytest.approx(100.0)
    assert sum(metrics["severityPercentages"].values()) == pytest.approx(100.0)


def test_resolution_rate():
    incidents = [make(status="CLOSED"), make(status="CLOSED"), make(), make()]
    assert compute_metrics(incidents)["resolutionRate"] == 50.0


# --- donut ----------------------------------------------------------------


def test_donut_is_empty_without_data():
    assert build_donut(compute_metrics([])) == []


def test_donut_skips_absent_severities():
    donut = build_donut(compute_metrics([make(severity="P1"), make(severity="P1")]))
    assert [segment["severity"] for segment in donut] == ["P1"]


def test_donut_segments_fill_the_circle():
    incidents = [make(severity="P1"), make(severity="P2"), make(severity="P3"), make()]
    donut = build_donut(compute_metrics(incidents))
    assert sum(segment["dash"] for segment in donut) == pytest.approx(DONUT_CIRCUMFERENCE, abs=0.1)


def test_donut_offsets_are_cumulative():
    incidents = [make(severity="P1"), make(severity="P2")]
    donut = build_donut(compute_metrics(incidents))
    assert donut[0]["offset"] == 0
    assert donut[1]["offset"] == pytest.approx(-donut[0]["dash"], abs=0.1)


# --- API ------------------------------------------------------------------


def test_dashboard_api_reflects_data(client):
    seed(client)
    metrics = client.get("/api/dashboard").json()
    assert metrics["total"] == 6
    assert metrics["bySeverity"] == {"P1": 2, "P2": 3, "P3": 1}
    assert metrics["byStatus"] == {"OPEN": 3, "INVESTIGATING": 1, "MITIGATED": 1, "CLOSED": 1}
    assert metrics["active"] == 5


def test_dashboard_updates_after_status_change(client):
    seed(client)
    before = client.get("/api/dashboard").json()["byStatus"]["INVESTIGATING"]
    client.patch("/api/incidents/INC-0001", json={"status": "INVESTIGATING"})
    after = client.get("/api/dashboard").json()["byStatus"]["INVESTIGATING"]
    assert after == before + 1


def test_dashboard_updates_after_severity_change(client):
    seed(client)
    client.patch("/api/incidents/INC-0006", json={"severity": "P1"})
    assert client.get("/api/dashboard").json()["bySeverity"]["P1"] == 3


# --- filters --------------------------------------------------------------


def test_filter_by_status(client):
    seed(client)
    results = client.get("/api/incidents?status=OPEN").json()
    assert len(results) == 3
    assert {item["status"] for item in results} == {"OPEN"}


def test_filter_by_severity(client):
    seed(client)
    results = client.get("/api/incidents?severity=P2").json()
    assert len(results) == 3
    assert {item["severity"] for item in results} == {"P2"}


def test_filter_by_owner(client):
    seed(client)
    results = client.get("/api/incidents?owner=Priya").json()
    assert {item["owner"] for item in results} == {"Priya"}


def test_filter_by_owner_is_case_insensitive(client):
    seed(client)
    assert len(client.get("/api/incidents?owner=priya").json()) == 2


def test_filter_by_service(client):
    seed(client)
    results = client.get("/api/incidents?service=Order Service").json()
    assert [item["impactedService"] for item in results] == ["Order Service"]


def test_filters_combine(client):
    seed(client)
    results = client.get("/api/incidents?severity=P1&status=OPEN").json()
    assert len(results) == 1
    assert results[0]["title"] == "Checkout outage"


def test_unknown_filter_value_returns_422(client):
    assert client.get("/api/incidents?status=NOPE").status_code == 422


def test_filter_with_no_matches_returns_empty(client):
    seed(client)
    assert client.get("/api/incidents?severity=P3&status=CLOSED").json() == []


# --- search ---------------------------------------------------------------


def test_search_by_title(client):
    seed(client)
    results = client.get("/api/incidents?q=checkout").json()
    assert [item["title"] for item in results] == ["Checkout outage"]


def test_search_is_case_insensitive_substring(client):
    seed(client)
    assert len(client.get("/api/incidents?q=LATENCY").json()) == 1


def test_blank_search_returns_everything(client):
    seed(client)
    assert len(client.get("/api/incidents?q=   ").json()) == 6


# --- sorting --------------------------------------------------------------


def test_severity_rank_is_explicit():
    assert SEVERITY_RANK[Severity.P1] < SEVERITY_RANK[Severity.P2] < SEVERITY_RANK[Severity.P3]


def test_sort_by_severity_p1_first(client):
    seed(client)
    results = client.get("/api/incidents?sort_by=severity&order=asc").json()
    assert [item["severity"] for item in results] == ["P1", "P1", "P2", "P2", "P2", "P3"]


def test_sort_by_severity_reversed(client):
    seed(client)
    results = client.get("/api/incidents?sort_by=severity&order=desc").json()
    assert results[0]["severity"] == "P3"


def test_sort_by_created_date(client):
    seed(client)
    ascending = client.get("/api/incidents?sort_by=createdAt&order=asc").json()
    assert [item["incidentId"] for item in ascending] == [
        f"INC-000{n}" for n in range(1, 7)
    ]


def test_default_sort_is_newest_first(client):
    seed(client)
    assert client.get("/api/incidents").json()[0]["incidentId"] == "INC-0006"


def test_unknown_sort_field_falls_back_to_created(client):
    seed(client)
    results = client.get("/api/incidents?sort_by=bogus").json()
    assert results[0]["incidentId"] == "INC-0006"


# --- web pages ------------------------------------------------------------


def test_dashboard_page_renders_metrics(client):
    seed(client)
    page = client.get("/dashboard")
    assert page.status_code == 200
    assert "Total incidents" in page.text
    assert "Resolution rate" in page.text


def test_dashboard_page_renders_donut(client):
    seed(client)
    page = client.get("/dashboard").text
    assert "stroke-dasharray" in page
    assert "donut-P1" in page and "donut-P2" in page and "donut-P3" in page


def test_dashboard_page_handles_zero_incidents(client):
    page = client.get("/dashboard")
    assert page.status_code == 200
    assert "No incidents to chart yet" in page.text
    assert "stroke-dasharray" not in page.text


def test_dashboard_shows_progress_bars(client):
    seed(client)
    page = client.get("/dashboard").text
    assert "bar-fill fill-OPEN" in page
    assert "width:" in page


def test_list_page_filter_by_status(client):
    seed(client)
    page = client.get("/incidents?status=CLOSED").text
    assert "Cart errors" in page
    assert "Checkout outage" not in page
    assert "Showing 1 of 6 incidents." in page


def test_list_page_search(client):
    seed(client)
    page = client.get("/incidents?q=payment").text
    assert "Payment failures" in page
    assert "Login delay" not in page


def test_list_page_no_matches_message(client):
    seed(client)
    page = client.get("/incidents?q=zzzznotfound").text
    assert "No incidents match these filters" in page


def test_list_page_filter_dropdowns_populated(client):
    seed(client)
    page = client.get("/incidents").text
    assert "Priya" in page and "Arun" in page
    assert "Auth Service" in page
