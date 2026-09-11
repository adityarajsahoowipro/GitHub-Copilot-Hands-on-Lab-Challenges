"""Shared Jinja2 environment so routers don't import from main (circular import)."""

from __future__ import annotations

from fastapi.templating import Jinja2Templates

from app.config import APP_NAME, TEMPLATES_DIR
from app.services.sla import format_duration
from app.utils.time import format_display

templates = Jinja2Templates(directory=str(TEMPLATES_DIR))
templates.env.globals["app_name"] = APP_NAME
templates.env.filters["datetime"] = format_display
templates.env.filters["duration"] = format_duration
