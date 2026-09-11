import json

from app.config import DATA_DIR_ENV_VAR, get_incidents_file


def create(client, **overrides):
    payload = {
        "title": "Checkout service unavailable",
        "description": "Repeated database connection failures.",
        "severity": "P1",
        "impactedService": "Checkout Service",
        "owner": "Priya",
    }
    payload.update(overrides)
    return client.post("/api/incidents", json=payload)


# --- creation -------------------------------------------------------------


def test_create_incident_returns_defaults(client, sample_payload):
    response = client.post("/api/incidents", json=sample_payload)
    assert response.status_code == 201
    body = response.json()
    assert body["incidentId"] == "INC-0001"
    assert body["status"] == "OPEN"
    assert body["severity"] == "P1"
    assert body["createdAt"] and body["updatedAt"]
    assert body["timeline"][0]["type"] == "CREATED"


def test_incident_ids_increment(client):
    assert create(client).json()["incidentId"] == "INC-0001"
    assert create(client).json()["incidentId"] == "INC-0002"
    assert create(client).json()["incidentId"] == "INC-0003"


def test_ids_stay_unique_across_existing_records(client):
    create(client)
    create(client)
    ids = [item["incidentId"] for item in client.get("/api/incidents").json()]
    assert len(ids) == len(set(ids))


def test_incident_persisted_to_json_file(client, sample_payload, monkeypatch, tmp_path):
    monkeypatch.setenv(DATA_DIR_ENV_VAR, str(tmp_path))
    client.post("/api/incidents", json=sample_payload)
    stored = json.loads(get_incidents_file().read_text())
    assert len(stored) == 1
    assert stored[0]["incidentId"] == "INC-0001"


# --- listing and detail ---------------------------------------------------


def test_list_is_empty_initially(client):
    assert client.get("/api/incidents").json() == []


def test_created_incident_appears_in_list(client):
    incident_id = create(client).json()["incidentId"]
    listed = client.get("/api/incidents").json()
    assert [item["incidentId"] for item in listed] == [incident_id]


def test_get_incident_detail(client):
    incident_id = create(client, title="Payment latency spike").json()["incidentId"]
    response = client.get(f"/api/incidents/{incident_id}")
    assert response.status_code == 200
    assert response.json()["title"] == "Payment latency spike"


def test_unknown_incident_returns_404(client):
    response = client.get("/api/incidents/INC-9999")
    assert response.status_code == 404
    assert "INC-9999" in response.json()["detail"]


# --- validation -----------------------------------------------------------


def test_empty_title_rejected(client):
    assert create(client, title="").status_code == 422


def test_whitespace_only_title_rejected(client):
    assert create(client, title="   ").status_code == 422


def test_missing_severity_rejected(client):
    payload = {"title": "No severity", "impactedService": "Checkout Service"}
    assert client.post("/api/incidents", json=payload).status_code == 422


def test_invalid_severity_rejected(client):
    assert create(client, severity="P9").status_code == 422


def test_missing_impacted_service_rejected(client):
    assert create(client, impactedService="").status_code == 422


def test_title_and_service_are_trimmed(client):
    body = create(client, title="  Spaced title  ", impactedService="  Order Service  ").json()
    assert body["title"] == "Spaced title"
    assert body["impactedService"] == "Order Service"


# --- web UI ---------------------------------------------------------------


def test_web_form_creates_and_redirects(client):
    response = client.post(
        "/incidents/new",
        data={
            "title": "Order service degraded",
            "description": "Elevated error rate.",
            "severity": "P2",
            "impactedService": "Order Service",
            "owner": "Arun",
        },
        follow_redirects=False,
    )
    assert response.status_code == 303
    assert response.headers["location"] == "/incidents/INC-0001"


def test_web_list_shows_created_incident(client):
    create(client, title="Visible in list")
    page = client.get("/incidents")
    assert page.status_code == 200
    assert "Visible in list" in page.text
    assert "INC-0001" in page.text


def test_web_detail_page_renders(client):
    create(client, title="Detail page incident")
    page = client.get("/incidents/INC-0001")
    assert page.status_code == 200
    assert "Detail page incident" in page.text
    assert "CREATED" in page.text


def test_web_form_shows_error_and_keeps_input(client):
    response = client.post(
        "/incidents/new",
        data={"title": "", "severity": "", "impactedService": "Checkout Service", "owner": "Arun"},
    )
    assert response.status_code == 400
    assert "Incident title must not be empty." in response.text
    assert "Severity must be selected" in response.text
    # Previous input is preserved so the user does not retype it.
    assert "Checkout Service" in response.text


def test_web_unknown_incident_returns_404_page(client):
    response = client.get("/incidents/INC-9999")
    assert response.status_code == 404
    assert "INC-9999" in response.text
