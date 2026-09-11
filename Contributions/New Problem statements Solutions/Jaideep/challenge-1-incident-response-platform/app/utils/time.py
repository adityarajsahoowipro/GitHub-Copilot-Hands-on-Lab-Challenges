"""UTC time helpers. Every timestamp in the app goes through these functions."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def ensure_utc(value: datetime) -> datetime:
    """Treat naive datetimes as UTC so aware/naive arithmetic never raises."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def to_iso(value: datetime) -> str:
    return ensure_utc(value).isoformat().replace("+00:00", "Z")


def parse_iso(value: Any) -> datetime | None:
    """Parse an ISO-8601 string, returning None for anything unusable."""
    if isinstance(value, datetime):
        return ensure_utc(value)
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return ensure_utc(datetime.fromisoformat(value.strip()))
    except ValueError:
        return None


def format_display(value: Any) -> str:
    parsed = parse_iso(value)
    return parsed.strftime("%d %b %Y, %H:%M UTC") if parsed else "—"
