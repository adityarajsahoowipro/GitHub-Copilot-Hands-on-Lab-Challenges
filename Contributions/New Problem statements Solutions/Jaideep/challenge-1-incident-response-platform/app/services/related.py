"""Rule-based related-incident detection and linking. No external model involved."""

from __future__ import annotations

import re
from datetime import datetime

from app.errors import ValidationError
from app.models import Incident, RelatedMatch, TimelineEntry
from app.services import incidents as incident_service
from app.utils.time import now_utc

# Incidents raised further apart than this are never matched on time proximity alone.
TIME_WINDOW_MINUTES = 120
MAX_SUGGESTIONS = 5

# Weights only order the suggestions; the reasons are what the user actually reads.
WEIGHT_SERVICE = 4
WEIGHT_ERROR_CODE = 4
WEIGHT_CATEGORY = 3
WEIGHT_TITLE_KEYWORD = 2
WEIGHT_DESCRIPTION_KEYWORD = 1
WEIGHT_TIME_WINDOW = 1

STOPWORDS = frozenset(
    {
        "after", "and", "are", "back", "been", "being", "but", "customer", "customers",
        "down", "during", "for", "from", "has", "have", "high", "incident", "into",
        "issue", "issues", "not", "off", "one", "only", "our", "out", "over", "problem",
        "problems", "service", "services", "some", "the", "this", "that", "their",
        "there", "them", "then", "user", "users", "was", "were", "when", "with",
        "will", "within", "you", "your",
    }
)

_WORD_PATTERN = re.compile(r"[a-z][a-z0-9]{2,}")

# HTTP status codes, ORA-01234 / ERR-500 style codes and bare E1234 codes.
_ERROR_CODE_PATTERNS = (
    re.compile(r"\b(?:http\s*)?([45]\d{2})\b(?:s)?"),
    re.compile(r"\b([a-z]{2,5}[-_]\d{2,6})\b"),
    re.compile(r"\b(e\d{3,6})\b"),
)

FAILURE_CATEGORIES: dict[str, tuple[str, ...]] = {
    "timeout": ("timeout", "timeouts", "timing", "timed", "latency", "slow", "hang", "hanging"),
    "database": ("database", "db", "sql", "query", "deadlock", "connection", "connections"),
    "deployment": ("deploy", "deployed", "deployment", "release", "rollback", "rollout"),
    "capacity": ("capacity", "throttled", "throttling", "quota", "memory", "cpu", "disk", "backlog"),
    "network": ("network", "dns", "tls", "certificate", "gateway", "upstream", "proxy"),
    "authentication": ("auth", "login", "token", "session", "credential", "credentials", "oauth"),
    "data-integrity": ("incorrect", "mismatch", "corrupt", "duplicate", "missing", "stale"),
}


def _normalise(word: str) -> str:
    """Crude singularisation so 'timeouts' matches 'timeout'."""
    return word[:-1] if word.endswith("s") and len(word) > 4 else word


_CATEGORY_MARKERS = {
    name: {_normalise(marker) for marker in markers}
    for name, markers in FAILURE_CATEGORIES.items()
}


def _keywords(text: str) -> set[str]:
    return {
        _normalise(word)
        for word in _WORD_PATTERN.findall(text.casefold())
        if word not in STOPWORDS
    }


def _error_codes(text: str) -> set[str]:
    lowered = text.casefold()
    codes: set[str] = set()
    for pattern in _ERROR_CODE_PATTERNS:
        codes.update(match.upper() for match in pattern.findall(lowered))
    return codes


def _categories(text: str) -> set[str]:
    words = _keywords(text)
    return {name for name, markers in _CATEGORY_MARKERS.items() if words & markers}


def _minutes_apart(left: datetime | None, right: datetime | None) -> float | None:
    if left is None or right is None:
        return None
    return abs((left - right).total_seconds()) / 60


def _format_gap(minutes: float) -> str:
    if minutes < 1:
        return "less than a minute"
    if minutes < 60:
        return f"{round(minutes)} minutes"
    hours = minutes / 60
    return f"{hours:.1f} hours".replace(".0 ", " ")


def _quoted(values: set[str], limit: int = 3) -> str:
    return ", ".join(f'"{value}"' for value in sorted(values)[:limit])


def _evaluate(source: Incident, candidate: Incident) -> tuple[int, list[str]]:
    """Return the match score and the human-readable reasons behind it."""
    reasons: list[str] = []
    score = 0
    strong = False

    if source.impactedService.casefold() == candidate.impactedService.casefold():
        reasons.append(f"Both incidents affect the {candidate.impactedService}")
        score += WEIGHT_SERVICE
        strong = True

    shared_codes = _error_codes(f"{source.title} {source.description}") & _error_codes(
        f"{candidate.title} {candidate.description}"
    )
    if shared_codes:
        reasons.append(f"Both incidents report error code {_quoted(shared_codes)}")
        score += WEIGHT_ERROR_CODE
        strong = True

    shared_titles = _keywords(source.title) & _keywords(candidate.title)
    if shared_titles:
        reasons.append(f"Both titles contain the keyword {_quoted(shared_titles)}")
        score += WEIGHT_TITLE_KEYWORD * min(len(shared_titles), 3)
        strong = True

    shared_categories = _categories(
        f"{source.title} {source.description}"
    ) & _categories(f"{candidate.title} {candidate.description}")
    if shared_categories:
        reasons.append(
            f"Both incidents look like a {_quoted(shared_categories, limit=2)} failure"
        )
        score += WEIGHT_CATEGORY
        strong = True

    shared_descriptions = (
        _keywords(source.description) & _keywords(candidate.description)
    ) - shared_titles
    if shared_descriptions:
        reasons.append(
            f"The descriptions share the keyword {_quoted(shared_descriptions)}"
        )
        score += WEIGHT_DESCRIPTION_KEYWORD * min(len(shared_descriptions), 3)
        # A single shared description word is too weak to relate two incidents on its own.
        strong = strong or len(shared_descriptions) > 1

    gap = _minutes_apart(source.createdAt, candidate.createdAt)
    if gap is not None and gap <= TIME_WINDOW_MINUTES:
        reasons.append(
            f"The incidents were created within {_format_gap(gap)} of each other"
        )
        score += WEIGHT_TIME_WINDOW

    # Time proximity alone is coincidence, not a relationship.
    return (score, reasons) if strong else (0, [])


def find_related(incident_id: str, limit: int = MAX_SUGGESTIONS) -> list[RelatedMatch]:
    """Suggestions for an incident, most convincing first. Never includes itself."""
    source = incident_service.get_incident(incident_id)
    linked = set(source.relatedIncidents)

    matches: list[RelatedMatch] = []
    for candidate in incident_service.list_incidents():
        if candidate.incidentId == source.incidentId:
            continue
        score, reasons = _evaluate(source, candidate)
        if score <= 0:
            continue
        matches.append(
            RelatedMatch(
                incidentId=candidate.incidentId,
                title=candidate.title,
                impactedService=candidate.impactedService,
                severity=candidate.severity,
                status=candidate.status,
                createdAt=candidate.createdAt,
                score=score,
                reasons=reasons,
                linked=candidate.incidentId in linked,
            )
        )

    matches.sort(key=lambda item: (-item.score, item.incidentId))
    return matches[:limit]


def list_links(incident_id: str) -> list[Incident]:
    """Linked incidents that still exist, in ID order."""
    source = incident_service.get_incident(incident_id)
    linked = []
    for candidate in incident_service.list_incidents():
        if candidate.incidentId in source.relatedIncidents:
            linked.append(candidate)
    linked.sort(key=lambda item: item.incidentId)
    return linked


def _persist_link(incident: Incident, other_id: str, timestamp: datetime) -> None:
    incident.relatedIncidents = sorted({*incident.relatedIncidents, other_id})
    incident.updatedAt = timestamp
    incident.timeline.append(
        TimelineEntry(
            timestamp=timestamp,
            type="LINKED",
            message=f"Linked to related incident {other_id}.",
        )
    )
    incident_service.replace_incident(incident)


def link_incidents(incident_id: str, related_id: str) -> Incident:
    """Create a symmetric link. Self-links and repeat links are rejected."""
    source = incident_service.get_incident(incident_id)
    if incident_id == related_id:
        raise ValidationError("An incident cannot be linked to itself.")

    related = incident_service.get_incident(related_id)
    if related_id in source.relatedIncidents:
        raise ValidationError(
            f"{incident_id} is already linked to {related_id}."
        )

    timestamp = now_utc()
    _persist_link(source, related_id, timestamp)
    _persist_link(related, incident_id, timestamp)
    return incident_service.get_incident(incident_id)
