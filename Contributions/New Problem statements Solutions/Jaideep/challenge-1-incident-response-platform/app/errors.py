"""Domain errors shared by services and mapped to HTTP codes by routers."""

from __future__ import annotations


class DomainError(Exception):
    """Base class for expected, user-facing failures."""


class NotFoundError(DomainError):
    pass


class DuplicateIncidentError(DomainError):
    pass


class InvalidTransitionError(DomainError):
    pass


class ValidationError(DomainError):
    pass
