"""Thread-safe JSON list persistence with atomic writes."""

from __future__ import annotations

import copy
import json
import os
import tempfile
import threading
from pathlib import Path
from typing import Any


class JsonStore:
    def __init__(self, path: Path, id_field: str) -> None:
        self._path = Path(path)
        self._id_field = id_field
        self._lock = threading.Lock()
        self._records: list[dict[str, Any]] = self._read_from_disk()

    def _read_from_disk(self) -> list[dict[str, Any]]:
        """A missing, empty or corrupt file is treated as an empty store."""
        try:
            raw = self._path.read_text(encoding="utf-8")
        except OSError:
            return []
        if not raw.strip():
            return []
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return []
        return [item for item in data if isinstance(item, dict)] if isinstance(data, list) else []

    def _write_to_disk(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        # Same-directory temp file keeps os.replace atomic (no cross-device rename).
        handle, tmp_name = tempfile.mkstemp(dir=self._path.parent, suffix=".tmp")
        try:
            with os.fdopen(handle, "w", encoding="utf-8") as stream:
                json.dump(self._records, stream, indent=2, ensure_ascii=False)
            os.replace(tmp_name, self._path)
        except BaseException:
            Path(tmp_name).unlink(missing_ok=True)
            raise

    def load_all(self) -> list[dict[str, Any]]:
        with self._lock:
            return copy.deepcopy(self._records)

    def get(self, record_id: str) -> dict[str, Any] | None:
        with self._lock:
            for record in self._records:
                if record.get(self._id_field) == record_id:
                    return copy.deepcopy(record)
        return None

    def add(self, record: dict[str, Any]) -> dict[str, Any]:
        record_id = record.get(self._id_field)
        with self._lock:
            if any(item.get(self._id_field) == record_id for item in self._records):
                raise ValueError(f"Record with {self._id_field}={record_id!r} already exists.")
            self._records.append(copy.deepcopy(record))
            self._write_to_disk()
        return copy.deepcopy(record)

    def replace(self, record_id: str, record: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            for index, item in enumerate(self._records):
                if item.get(self._id_field) == record_id:
                    self._records[index] = copy.deepcopy(record)
                    self._write_to_disk()
                    return copy.deepcopy(record)
        raise KeyError(record_id)


_stores: dict[str, JsonStore] = {}
_registry_lock = threading.Lock()


def get_store(path: Path, id_field: str) -> JsonStore:
    """Cache one store per file path so the data-dir env override is honoured."""
    key = str(Path(path).resolve())
    with _registry_lock:
        store = _stores.get(key)
        if store is None:
            store = JsonStore(Path(path), id_field)
            _stores[key] = store
        return store


def reset_stores() -> None:
    with _registry_lock:
        _stores.clear()
