import pytest
from fastapi.testclient import TestClient

from app.config import DATA_DIR_ENV_VAR
from app.storage import reset_stores


@pytest.fixture
def client(tmp_path, monkeypatch):
    """Each test gets an isolated data directory and a fresh store cache."""
    monkeypatch.setenv(DATA_DIR_ENV_VAR, str(tmp_path))
    reset_stores()
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
    reset_stores()


@pytest.fixture
def sample_payload():
    return {
        "title": "Checkout service unavailable",
        "description": "Repeated database connection failures.",
        "severity": "P1",
        "impactedService": "Checkout Service",
        "owner": "Priya",
    }
