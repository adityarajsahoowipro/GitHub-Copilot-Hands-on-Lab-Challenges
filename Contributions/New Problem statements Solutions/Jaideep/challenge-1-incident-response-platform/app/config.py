"""Application configuration and filesystem paths."""

from __future__ import annotations

import os
from pathlib import Path

APP_NAME = "Incident Response Platform"

BASE_DIR = Path(__file__).resolve().parent.parent
APP_DIR = BASE_DIR / "app"
TEMPLATES_DIR = APP_DIR / "templates"
STATIC_DIR = APP_DIR / "static"

# Env override keeps tests isolated from the real data directory.
DATA_DIR_ENV_VAR = "INCIDENT_DATA_DIR"


def get_data_dir() -> Path:
    """Resolve the data directory, honouring the env override at call time."""
    override = os.environ.get(DATA_DIR_ENV_VAR)
    return Path(override).resolve() if override else BASE_DIR / "data"


def get_incidents_file() -> Path:
    return get_data_dir() / "incidents.json"


def get_rca_file() -> Path:
    return get_data_dir() / "rca.json"


def ensure_data_files() -> None:
    """Create the data directory and seed empty JSON stores if absent."""
    get_data_dir().mkdir(parents=True, exist_ok=True)
    for path in (get_incidents_file(), get_rca_file()):
        if not path.exists():
            path.write_text("[]", encoding="utf-8")
