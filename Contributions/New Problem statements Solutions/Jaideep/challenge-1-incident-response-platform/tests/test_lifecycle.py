import pytest

from app.models import Status
from app.services.incidents import ALLOWED_TRANSITIONS, is_valid_transition


def create(client, **overrides):
    payload = {
        "title": "Checkout service unavailable",
        "severity": "P2",
        "impactedService": "Checkout Service",
    }
    payload.update(overrides)
    return client.post("/api/incidents", json=payload).json()["incidentId"]


def patch(client, incident_id, **fields):
    return client.patch(f"/api/incidents/{incident_id}", json=fields)


def advance(client, incident_id, *statuses):
    for target in statuses:
        response = patch(client, incident_id, status=target)
        assert response.status_code == 200, response.text
    return response


# --- transition table -----------------------------------------------------


def test_transition_table_matches_spec():
    assert ALLOWED_TRANSITIONS[Status.OPEN] == {Status.INVESTIGATING}
    assert ALLOWED_TRANSITIONS[Status.INVESTIGATING] == {Status.MITIGATED}
    assert ALLOWED_TRANSITIONS[Status.MITIGATED] == {Status.CLOSED}
    assert ALLOWED_TRANSITIONS[Status.CLOSED] == {Status.OPEN}


def test_same_status_is_a_no_op_not_a_transition():
    assert is_valid_transition(Status.OPEN, Status.OPEN) is True
    assert is_valid_transition(Status.CLOSED, Status.CLOSED) is True


# --- happy path -----------------------------------------------------------


def test_full_lifecycle_walks_forward(client):
    incident_id = create(client)
    response = advance(client, incident_id, "INVESTIGATING", "MITIGATED", "CLOSED")
    assert response.json()["status"] == "CLOSED"


def test_closing_sets_resolved_at(client):
    incident_id = create(client)
    body = advance(client, incident_id, "INVESTIGATING", "MITIGATED", "CLOSED").json()
    assert body["resolvedAt"] is not None


def test_resolved_at_is_none_before_closing(client):
    incident_id = create(client)
    assert patch(client, incident_id, status="INVESTIGATING").json()["resolvedAt"] is None


def test_each_change_appends_one_timeline_entry(client):
    incident_id = create(client)
    body = patch(client, incident_id, status="INVESTIGATING", owner="Priya").json()
    types = [entry["type"] for entry in body["timeline"]]
    assert types == ["CREATED", "STATUS_CHANGED", "OWNER_CHANGED"]


def test_updated_at_advances_on_change(client):
    incident_id = create(client)
    before = client.get(f"/api/incidents/{incident_id}").json()["updatedAt"]
    after = patch(client, incident_id, owner="Priya").json()["updatedAt"]
    assert after >= before


def test_no_op_update_adds_no_timeline_entry(client):
    incident_id = create(client)
    body = patch(client, incident_id, status="OPEN").json()
    assert [entry["type"] for entry in body["timeline"]] == ["CREATED"]


# --- ownership and field updates -----------------------------------------


def test_assign_owner(client):
    incident_id = create(client)
    assert patch(client, incident_id, owner="Priya").json()["owner"] == "Priya"


def test_change_owner_records_both_names(client):
    incident_id = create(client, owner="Arun")
    body = patch(client, incident_id, owner="Priya").json()
    assert body["owner"] == "Priya"
    assert "Arun" in body["timeline"][-1]["message"]
    assert "Priya" in body["timeline"][-1]["message"]


def test_update_severity_and_service(client):
    incident_id = create(client)
    body = patch(client, incident_id, severity="P1", impactedService="Order Service").json()
    assert body["severity"] == "P1"
    assert body["impactedService"] == "Order Service"


def test_invalid_severity_rejected_on_update(client):
    incident_id = create(client)
    assert patch(client, incident_id, severity="P9").status_code == 422


# --- invalid transitions --------------------------------------------------


@pytest.mark.parametrize(
    "path, target",
    [
        ([], "CLOSED"),
        ([], "MITIGATED"),
        (["INVESTIGATING", "MITIGATED"], "OPEN"),
        (["INVESTIGATING", "MITIGATED"], "INVESTIGATING"),
        (["INVESTIGATING", "MITIGATED", "CLOSED"], "INVESTIGATING"),
        (["INVESTIGATING", "MITIGATED", "CLOSED"], "MITIGATED"),
    ],
)
def test_invalid_transitions_rejected(client, path, target):
    incident_id = create(client)
    if path:
        advance(client, incident_id, *path)
    response = patch(client, incident_id, status=target)
    assert response.status_code == 400
    assert "Invalid status transition" in response.json()["detail"]


def test_rejection_message_names_both_states(client):
    incident_id = create(client)
    detail = patch(client, incident_id, status="CLOSED").json()["detail"]
    assert "OPEN" in detail and "CLOSED" in detail
    assert "Allowed from OPEN: INVESTIGATING" in detail


def test_closed_only_allows_reopening(client):
    incident_id = create(client)
    advance(client, incident_id, "INVESTIGATING", "MITIGATED", "CLOSED")
    detail = patch(client, incident_id, status="INVESTIGATING").json()["detail"]
    assert "Allowed from CLOSED: OPEN" in detail


# --- reopening ------------------------------------------------------------


def test_closed_incident_can_be_reopened(client):
    incident_id = create(client)
    advance(client, incident_id, "INVESTIGATING", "MITIGATED", "CLOSED")
    body = patch(client, incident_id, status="OPEN").json()
    assert body["status"] == "OPEN"


def test_reopening_clears_resolved_at(client):
    incident_id = create(client)
    advance(client, incident_id, "INVESTIGATING", "MITIGATED", "CLOSED")
    assert patch(client, incident_id, status="OPEN").json()["resolvedAt"] is None


def test_reopening_appends_a_reopened_entry(client):
    incident_id = create(client)
    advance(client, incident_id, "INVESTIGATING", "MITIGATED", "CLOSED")
    body = patch(client, incident_id, status="OPEN").json()
    assert body["timeline"][-1]["type"] == "REOPENED"
    assert "reopened" in body["timeline"][-1]["message"]


def test_reopened_incident_walks_forward_again(client):
    incident_id = create(client)
    advance(client, incident_id, "INVESTIGATING", "MITIGATED", "CLOSED")
    patch(client, incident_id, status="OPEN")
    response = advance(client, incident_id, "INVESTIGATING", "MITIGATED", "CLOSED")
    assert response.json()["status"] == "CLOSED"
    assert response.json()["resolvedAt"] is not None


def test_reopening_resets_the_escalation_flag(client):
    incident_id = create(client)
    advance(client, incident_id, "INVESTIGATING", "MITIGATED", "CLOSED")
    assert patch(client, incident_id, status="OPEN").json()["escalated"] is False


def test_rejected_transition_leaves_incident_unchanged(client):
    incident_id = create(client)
    patch(client, incident_id, status="CLOSED")
    body = client.get(f"/api/incidents/{incident_id}").json()
    assert body["status"] == "OPEN"
    assert [entry["type"] for entry in body["timeline"]] == ["CREATED"]


def test_update_unknown_incident_returns_404(client):
    assert patch(client, "INC-9999", owner="Priya").status_code == 404


# --- web UI ---------------------------------------------------------------


def test_web_update_redirects_on_success(client):
    incident_id = create(client)
    response = client.post(
        f"/incidents/{incident_id}/update",
        data={"status": "INVESTIGATING", "owner": "Priya", "severity": "P2",
              "impactedService": "Checkout Service"},
        follow_redirects=False,
    )
    assert response.status_code == 303
    assert response.headers["location"] == f"/incidents/{incident_id}"


def test_web_invalid_transition_shows_error(client):
    incident_id = create(client)
    response = client.post(
        f"/incidents/{incident_id}/update",
        data={"status": "CLOSED", "owner": "", "severity": "P2",
              "impactedService": "Checkout Service"},
    )
    assert response.status_code == 400
    assert "Invalid status transition" in response.text
    assert "Allowed from OPEN: INVESTIGATING" in response.text


def test_web_form_only_offers_legal_next_status(client):
    incident_id = create(client)
    page = client.get(f"/incidents/{incident_id}").text
    assert "Move to INVESTIGATING" in page
    assert "Move to CLOSED" not in page
    assert "Move to MITIGATED" not in page


def test_web_form_offers_reopen_when_closed(client):
    incident_id = create(client)
    advance(client, incident_id, "INVESTIGATING", "MITIGATED", "CLOSED")
    page = client.get(f"/incidents/{incident_id}").text
    assert "Reopen incident" in page
    assert "Move to" not in page


def test_web_reopen_redirects_on_success(client):
    incident_id = create(client)
    advance(client, incident_id, "INVESTIGATING", "MITIGATED", "CLOSED")
    response = client.post(
        f"/incidents/{incident_id}/update",
        data={"status": "OPEN", "owner": "", "severity": "P2",
              "impactedService": "Checkout Service"},
        follow_redirects=False,
    )
    assert response.status_code == 303
    assert client.get(f"/api/incidents/{incident_id}").json()["status"] == "OPEN"
