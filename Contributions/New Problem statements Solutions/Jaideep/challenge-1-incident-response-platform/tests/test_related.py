from datetime import timedelta

from app.services import incidents as incident_service


def create(client, **overrides):
    payload = {
        "title": "Payment gateway timeouts",
        "description": "Upstream provider returning 504 errors on checkout traffic.",
        "severity": "P1",
        "impactedService": "Payment Service",
        "owner": "Arun",
    }
    payload.update(overrides)
    return client.post("/api/incidents", json=payload).json()


# --- detection ------------------------------------------------------------


def test_matches_same_service_and_title_keyword(client):
    source = create(client)
    create(client, title="Payment retries timeout", description="Card captures fail.")

    matches = client.get(f"/api/incidents/{source['incidentId']}/related").json()

    assert [match["incidentId"] for match in matches] == ["INC-0002"]
    reasons = " ".join(matches[0]["reasons"])
    assert "Payment Service" in reasons
    assert "timeout" in reasons
    assert "created within" in reasons


def test_matches_shared_error_code_across_services(client):
    source = create(client)
    create(
        client,
        title="Search latency spike",
        description="Edge returns 504 on a third of queries.",
        impactedService="Search Service",
    )

    matches = client.get(f"/api/incidents/{source['incidentId']}/related").json()

    reasons = " ".join(matches[0]["reasons"])
    assert "error code" in reasons
    assert "504" in reasons


def test_unrelated_incident_is_not_suggested(client):
    source = create(client)
    create(
        client,
        title="Quarterly report export button misaligned",
        description="Minor cosmetic defect on the finance report screen.",
        impactedService="Reporting Service",
        severity="P3",
    )

    matches = client.get(f"/api/incidents/{source['incidentId']}/related").json()

    assert matches == []


def test_incident_never_matches_itself(client):
    source = create(client)
    create(client)

    matches = client.get(f"/api/incidents/{source['incidentId']}/related").json()

    assert source["incidentId"] not in [match["incidentId"] for match in matches]


def test_related_for_unknown_incident_returns_404(client):
    assert client.get("/api/incidents/INC-9999/related").status_code == 404


# --- linking --------------------------------------------------------------


def test_link_is_symmetric_and_recorded_on_the_timeline(client):
    source = create(client)
    other = create(client, title="Payment retries timeout")

    response = client.post(
        f"/api/incidents/{source['incidentId']}/links",
        json={"relatedIncidentId": other["incidentId"]},
    )

    assert response.status_code == 201
    assert response.json()["relatedIncidents"] == [other["incidentId"]]
    assert client.get(f"/api/incidents/{other['incidentId']}").json()["relatedIncidents"] == [
        source["incidentId"]
    ]
    types = [entry["type"] for entry in response.json()["timeline"]]
    assert "LINKED" in types


def test_cannot_link_incident_to_itself(client):
    source = create(client)

    response = client.post(
        f"/api/incidents/{source['incidentId']}/links",
        json={"relatedIncidentId": source["incidentId"]},
    )

    assert response.status_code == 400
    assert "itself" in response.json()["detail"]


def test_cannot_link_the_same_pair_twice(client):
    source = create(client)
    other = create(client, title="Payment retries timeout")
    body = {"relatedIncidentId": other["incidentId"]}

    client.post(f"/api/incidents/{source['incidentId']}/links", json=body)
    response = client.post(f"/api/incidents/{source['incidentId']}/links", json=body)

    assert response.status_code == 400
    assert "already linked" in response.json()["detail"]
    assert len(client.get(f"/api/incidents/{source['incidentId']}/links").json()) == 1


def test_reverse_link_is_also_rejected(client):
    source = create(client)
    other = create(client, title="Payment retries timeout")
    client.post(
        f"/api/incidents/{source['incidentId']}/links",
        json={"relatedIncidentId": other["incidentId"]},
    )

    response = client.post(
        f"/api/incidents/{other['incidentId']}/links",
        json={"relatedIncidentId": source["incidentId"]},
    )

    assert response.status_code == 400


def test_link_to_unknown_incident_returns_404(client):
    source = create(client)

    response = client.post(
        f"/api/incidents/{source['incidentId']}/links",
        json={"relatedIncidentId": "INC-9999"},
    )

    assert response.status_code == 404


def test_suggestion_is_marked_as_linked(client):
    source = create(client)
    other = create(client, title="Payment retries timeout")
    client.post(
        f"/api/incidents/{source['incidentId']}/links",
        json={"relatedIncidentId": other["incidentId"]},
    )

    matches = client.get(f"/api/incidents/{source['incidentId']}/related").json()

    assert matches[0]["linked"] is True


# --- detection rules ------------------------------------------------------


def test_time_proximity_alone_does_not_create_a_match(client):
    source = create(client)
    create(
        client,
        title="Warehouse label printer offline",
        description="Depot hardware fault reported by the night shift.",
        impactedService="Logistics Service",
    )

    assert client.get(f"/api/incidents/{source['incidentId']}/related").json() == []


def test_matches_are_ordered_by_score(client):
    source = create(client)
    create(client, title="Payment gateway timeouts")
    create(
        client,
        title="Cart totals incorrect",
        description="Totals drift after a slow upstream call.",
        impactedService="Cart Service",
    )

    matches = client.get(f"/api/incidents/{source['incidentId']}/related").json()

    assert matches[0]["incidentId"] == "INC-0002"
    assert matches[0]["score"] >= matches[-1]["score"]


def test_limit_caps_the_number_of_suggestions(client):
    source = create(client)
    for _ in range(3):
        create(client)

    matches = client.get(f"/api/incidents/{source['incidentId']}/related?limit=2").json()

    assert len(matches) == 2


def test_incidents_outside_the_time_window_are_matched_on_content_only(client):
    source = create(client)
    create(client, title="Payment gateway timeouts")
    stale = incident_service.get_incident("INC-0002")
    stale.createdAt = stale.createdAt - timedelta(days=3)
    incident_service.replace_incident(stale)

    matches = client.get(f"/api/incidents/{source['incidentId']}/related").json()

    assert matches[0]["incidentId"] == "INC-0002"
    assert not any("created within" in reason for reason in matches[0]["reasons"])


# --- web page -------------------------------------------------------------


def test_detail_page_shows_suggestions_with_reasons(client):
    source = create(client)
    create(client, title="Payment retries timeout")

    page = client.get(f"/incidents/{source['incidentId']}").text

    assert "Possible related incidents" in page
    assert "Reason:" in page
    assert "Both incidents affect the Payment Service" in page


def test_web_link_form_creates_the_link(client):
    source = create(client)
    other = create(client, title="Payment retries timeout")

    response = client.post(
        f"/incidents/{source['incidentId']}/link",
        data={"relatedIncidentId": other["incidentId"]},
        follow_redirects=True,
    )

    assert response.status_code == 200
    assert "Linked incidents" in response.text
    assert client.get(f"/api/incidents/{source['incidentId']}").json()["relatedIncidents"] == [
        other["incidentId"]
    ]


def test_web_self_link_shows_an_error(client):
    source = create(client)

    response = client.post(
        f"/incidents/{source['incidentId']}/link",
        data={"relatedIncidentId": source["incidentId"]},
    )

    assert response.status_code == 400
    assert "cannot be linked to itself" in response.text
