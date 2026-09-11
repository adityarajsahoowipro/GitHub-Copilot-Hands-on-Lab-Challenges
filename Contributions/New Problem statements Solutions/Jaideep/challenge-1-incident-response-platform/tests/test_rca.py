from app.config import get_rca_file
from app.models import Severity
from app.services.rca import SEVERITY_RECOMMENDATIONS


def create(client, **overrides):
    payload = {
        "title": "Checkout service unavailable",
        "description": "Repeated database connection failures.",
        "severity": "P1",
        "impactedService": "Checkout Service",
        "owner": "Priya",
    }
    payload.update(overrides)
    return client.post("/api/incidents", json=payload).json()["incidentId"]


def close(client, incident_id):
    for target in ("INVESTIGATING", "MITIGATED", "CLOSED"):
        client.patch(f"/api/incidents/{incident_id}", json={"status": target})


# --- generation -----------------------------------------------------------


def test_generate_returns_all_required_sections(client):
    incident_id = create(client)
    response = client.post(f"/api/incidents/{incident_id}/rca")
    assert response.status_code == 201
    report = response.json()["report"]
    for field in (
        "incidentId",
        "incidentSummary",
        "rootCause",
        "impactedServices",
        "resolution",
        "lessonsLearned",
        "recommendations",
        "generatedAt",
        "updatedAt",
    ):
        assert field in report, field


def test_rca_is_linked_to_the_right_incident(client):
    first = create(client, title="First incident")
    second = create(client, title="Second incident", impactedService="Order Service")
    client.post(f"/api/incidents/{first}/rca")
    client.post(f"/api/incidents/{second}/rca")

    assert client.get(f"/api/incidents/{first}/rca").json()["report"]["incidentId"] == first
    second_report = client.get(f"/api/incidents/{second}/rca").json()["report"]
    assert second_report["incidentId"] == second
    assert second_report["impactedServices"] == ["Order Service"]


def test_summary_uses_incident_data(client):
    incident_id = create(client)
    report = client.post(f"/api/incidents/{incident_id}/rca").json()["report"]
    assert "Checkout service unavailable" in report["incidentSummary"]
    assert "Checkout Service" in report["incidentSummary"]
    assert "P1" in report["incidentSummary"]
    assert "Repeated database connection failures." in report["incidentSummary"]


def test_impacted_services_taken_from_incident(client):
    incident_id = create(client, impactedService="Payment Service")
    report = client.post(f"/api/incidents/{incident_id}/rca").json()["report"]
    assert report["impactedServices"] == ["Payment Service"]


def test_recommendations_are_severity_specific(client):
    p1 = create(client, severity="P1")
    p3 = create(client, severity="P3")
    p1_report = client.post(f"/api/incidents/{p1}/rca").json()["report"]
    p3_report = client.post(f"/api/incidents/{p3}/rca").json()["report"]

    assert p1_report["recommendations"] == SEVERITY_RECOMMENDATIONS[Severity.P1]
    assert p3_report["recommendations"] == SEVERITY_RECOMMENDATIONS[Severity.P3]
    assert p1_report["recommendations"] != p3_report["recommendations"]


def test_postmortem_recommended_for_p1(client):
    incident_id = create(client, severity="P1")
    report = client.post(f"/api/incidents/{incident_id}/rca").json()["report"]
    assert any("postmortem" in item.lower() for item in report["recommendations"])


def test_resolution_reflects_closed_status(client):
    incident_id = create(client)
    close(client, incident_id)
    report = client.post(f"/api/incidents/{incident_id}/rca").json()["report"]
    assert "closed" in report["resolution"].lower()


def test_persisted_to_rca_file(client):
    import json

    incident_id = create(client)
    client.post(f"/api/incidents/{incident_id}/rca")
    stored = json.loads(get_rca_file().read_text())
    assert len(stored) == 1
    assert stored[0]["incidentId"] == incident_id


# --- warnings -------------------------------------------------------------


def test_warning_when_incident_still_open(client):
    incident_id = create(client)
    warnings = client.post(f"/api/incidents/{incident_id}/rca").json()["warnings"]
    assert any("still OPEN" in warning for warning in warnings)
    assert any("Root cause cannot be inferred" in warning for warning in warnings)


def test_warning_when_description_missing(client):
    incident_id = create(client, description="")
    warnings = client.post(f"/api/incidents/{incident_id}/rca").json()["warnings"]
    assert any("description is empty" in warning for warning in warnings)


def test_warning_when_owner_missing(client):
    incident_id = create(client)
    client.patch(f"/api/incidents/{incident_id}", json={"owner": ""})
    warnings = client.post(f"/api/incidents/{incident_id}/rca").json()["warnings"]
    assert any("No owner" in warning for warning in warnings)


def test_no_warnings_for_complete_closed_incident(client):
    incident_id = create(client)
    close(client, incident_id)
    assert client.post(f"/api/incidents/{incident_id}/rca").json()["warnings"] == []


def test_warnings_recomputed_after_incident_changes(client):
    incident_id = create(client)
    assert client.get(f"/api/incidents/{incident_id}/rca") .status_code == 404
    client.post(f"/api/incidents/{incident_id}/rca")
    assert client.get(f"/api/incidents/{incident_id}/rca").json()["warnings"]
    close(client, incident_id)
    assert client.get(f"/api/incidents/{incident_id}/rca").json()["warnings"] == []


def test_open_incident_root_cause_is_not_invented(client):
    incident_id = create(client)
    report = client.post(f"/api/incidents/{incident_id}/rca").json()["report"]
    assert "has not been established" in report["rootCause"]


# --- unknown incident -----------------------------------------------------


def test_generate_for_unknown_incident_returns_404(client):
    response = client.post("/api/incidents/INC-9999/rca")
    assert response.status_code == 404
    assert response.json()["detail"] == (
        "No incident found with ID 'INC-9999'. Cannot generate RCA."
    )


def test_get_rca_for_unknown_incident_returns_404(client):
    assert client.get("/api/incidents/INC-9999/rca").status_code == 404


def test_get_rca_before_generation_returns_404(client):
    incident_id = create(client)
    response = client.get(f"/api/incidents/{incident_id}/rca")
    assert response.status_code == 404
    assert "Generate one first" in response.json()["detail"]


def test_update_unknown_rca_returns_404(client):
    assert client.put("/api/incidents/INC-9999/rca", json={"rootCause": "x"}).status_code == 404


# --- editing --------------------------------------------------------------


def test_edit_then_read_persists(client):
    incident_id = create(client)
    client.post(f"/api/incidents/{incident_id}/rca")
    client.put(
        f"/api/incidents/{incident_id}/rca",
        json={"rootCause": "Connection pool reached maximum capacity."},
    )
    report = client.get(f"/api/incidents/{incident_id}/rca").json()["report"]
    assert report["rootCause"] == "Connection pool reached maximum capacity."


def test_edit_lists(client):
    incident_id = create(client)
    client.post(f"/api/incidents/{incident_id}/rca")
    client.put(
        f"/api/incidents/{incident_id}/rca",
        json={
            "impactedServices": ["Checkout Service", "Order Service", "Payment Service"],
            "recommendations": ["Add connection-pool monitoring"],
        },
    )
    report = client.get(f"/api/incidents/{incident_id}/rca").json()["report"]
    assert len(report["impactedServices"]) == 3
    assert report["recommendations"] == ["Add connection-pool monitoring"]


def test_partial_edit_leaves_other_fields_intact(client):
    incident_id = create(client)
    original = client.post(f"/api/incidents/{incident_id}/rca").json()["report"]
    client.put(f"/api/incidents/{incident_id}/rca", json={"rootCause": "New cause"})
    updated = client.get(f"/api/incidents/{incident_id}/rca").json()["report"]
    assert updated["incidentSummary"] == original["incidentSummary"]
    assert updated["recommendations"] == original["recommendations"]


def test_update_bumps_updated_at_but_not_generated_at(client):
    incident_id = create(client)
    original = client.post(f"/api/incidents/{incident_id}/rca").json()["report"]
    updated = client.put(
        f"/api/incidents/{incident_id}/rca", json={"rootCause": "Edited"}
    ).json()["report"]
    assert updated["generatedAt"] == original["generatedAt"]
    assert updated["updatedAt"] >= original["updatedAt"]


def test_regenerate_preserves_generated_at_and_overwrites_edits(client):
    incident_id = create(client)
    original = client.post(f"/api/incidents/{incident_id}/rca").json()["report"]
    client.put(f"/api/incidents/{incident_id}/rca", json={"rootCause": "Manual edit"})
    regenerated = client.post(f"/api/incidents/{incident_id}/rca").json()["report"]
    assert regenerated["generatedAt"] == original["generatedAt"]
    assert regenerated["rootCause"] != "Manual edit"


def test_only_one_rca_per_incident(client):
    import json

    incident_id = create(client)
    client.post(f"/api/incidents/{incident_id}/rca")
    client.post(f"/api/incidents/{incident_id}/rca")
    assert len(json.loads(get_rca_file().read_text())) == 1


# --- web UI ---------------------------------------------------------------


def test_web_page_offers_generation_when_none_exists(client):
    incident_id = create(client)
    page = client.get(f"/incidents/{incident_id}/rca")
    assert page.status_code == 200
    assert "No RCA has been generated" in page.text
    assert "Generate RCA" in page.text


def test_web_generate_then_view(client):
    incident_id = create(client)
    response = client.post(f"/incidents/{incident_id}/rca/generate", follow_redirects=False)
    assert response.status_code == 303

    page = client.get(f"/incidents/{incident_id}/rca").text
    assert "Incident Summary:" in page
    assert "Root Cause:" in page
    assert "Impacted Services:" in page
    assert "Resolution:" in page
    assert "Lessons Learned:" in page
    assert "Recommendations:" in page


def test_web_edit_then_reload_shows_saved_content(client):
    incident_id = create(client)
    client.post(f"/incidents/{incident_id}/rca/generate")
    response = client.post(
        f"/incidents/{incident_id}/rca",
        data={
            "incidentSummary": "Edited summary",
            "rootCause": "Connection pool exhausted",
            "impactedServices": "Checkout Service\nOrder Service\n",
            "resolution": "Pool size increased",
            "lessonsLearned": "Monitoring gap",
            "recommendations": "Add pool monitoring\nAdd alerts\n",
        },
        follow_redirects=False,
    )
    assert response.status_code == 303

    page = client.get(f"/incidents/{incident_id}/rca").text
    assert "Edited summary" in page
    assert "Connection pool exhausted" in page
    assert "Order Service" in page
    assert "Add pool monitoring" in page


def test_web_multiline_fields_split_into_lists(client):
    incident_id = create(client)
    client.post(f"/incidents/{incident_id}/rca/generate")
    client.post(
        f"/incidents/{incident_id}/rca",
        data={
            "incidentSummary": "s",
            "rootCause": "r",
            "impactedServices": "One\n\n  Two  \nThree\n",
            "resolution": "x",
            "lessonsLearned": "y",
            "recommendations": "A\nB",
        },
    )
    report = client.get(f"/api/incidents/{incident_id}/rca").json()["report"]
    assert report["impactedServices"] == ["One", "Two", "Three"]
    assert report["recommendations"] == ["A", "B"]


def test_web_warning_banner_for_open_incident(client):
    incident_id = create(client)
    page = client.get(f"/incidents/{incident_id}/rca").text
    assert "Incomplete incident information" in page
    assert "Root cause cannot be inferred" in page


def test_web_rca_page_unknown_incident_404(client):
    response = client.get("/incidents/INC-9999/rca")
    assert response.status_code == 404
    assert "INC-9999" in response.text


def test_detail_page_links_to_rca(client):
    incident_id = create(client)
    page = client.get(f"/incidents/{incident_id}").text
    assert f"/incidents/{incident_id}/rca" in page
