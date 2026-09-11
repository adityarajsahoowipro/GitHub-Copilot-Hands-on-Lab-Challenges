from fastapi.testclient import TestClient

from app.config import APP_NAME
from app.main import app


def test_health_returns_ok():
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "app": APP_NAME}


def test_landing_page_shows_title():
    with TestClient(app) as client:
        response = client.get("/")
    assert response.status_code == 200
    assert "Incident Response Platform" in response.text


def test_openapi_docs_available():
    with TestClient(app) as client:
        assert client.get("/docs").status_code == 200
        assert client.get("/openapi.json").status_code == 200


def test_static_stylesheet_served():
    with TestClient(app) as client:
        response = client.get("/static/css/styles.css")
    assert response.status_code == 200
