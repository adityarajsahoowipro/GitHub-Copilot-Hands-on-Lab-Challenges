# Incident Response and Root Cause Analysis Platform

A production-incident tracking platform for engineering teams: create and triage
incidents, drive them through a controlled lifecycle, monitor them on a dashboard,
generate structured Root Cause Analysis reports, and track SLA compliance with
automatic escalation.

Built with **FastAPI + Jinja2** as a single process. One codebase serves both a
REST API and a server-rendered web UI. Storage is local JSON files — no database,
no Node toolchain, no CDN, no network access required at runtime.

---

## 1. Setup

Requires **Python 3.11+** (developed on 3.12.1).

```bash
python3 -m venv .venv-gh-lab
source .venv-gh-lab/bin/activate       # Windows: .venv-gh-lab\Scripts\activate
pip install -r requirements.txt
```

## 2. Run

```bash
uvicorn app.main:app --reload
```

Then open <http://127.0.0.1:8000>.

| URL | Purpose |
| --- | --- |
| `/` | Landing page |
| `/dashboard` | Metrics, charts, SLA monitoring |
| `/incidents` | Incident list with filters and search |
| `/incidents/new` | Create an incident |
| `/docs` | Interactive Swagger UI for the REST API |

### Load sample data

The app starts with an empty store. To populate six realistic incidents spanning
every severity, status and SLA state:

```bash
python scripts/seed.py http://127.0.0.1:8000
```

Restart the server afterwards — the seed script backdates `createdAt` directly in
`data/incidents.json` so the SLA states are varied and visible.

| ID | Severity | Status | Created | Resulting SLA state |
| --- | --- | --- | --- | --- |
| INC-0001 | P1 | OPEN | 5h ago | SLA_BREACHED (escalated) |
| INC-0002 | P1 | INVESTIGATING | 1h45m ago | APPROACHING_SLA |
| INC-0003 | P2 | MITIGATED | 1h ago | WITHIN_SLA |
| INC-0004 | P2 | OPEN | 6h ago | SLA_BREACHED (escalated) |
| INC-0005 | P2 | CLOSED | 3h ago | NOT_APPLICABLE (Resolved within SLA) |
| INC-0006 | P3 | OPEN | 30m ago | WITHIN_SLA |

To reset, delete `data/incidents.json` and `data/rca.json` and restart.

## 3. Tests

```bash
pytest tests/ -v          # 190 unit and integration tests
```

There is also an end-to-end script that drives a live server. It requires an
**empty** data store and will abort with a message if the store is not empty:

```bash
rm -f data/incidents.json && uvicorn app.main:app --port 8012   # terminal 1
python scripts/e2e_check.py http://127.0.0.1:8012               # terminal 2
```

---

## 4. Endpoint map

### REST API

| Method | Path | Feature |
| --- | --- | --- |
| `GET` | `/health` | 0 — health check |
| `POST` | `/api/incidents` | 1 — create incident |
| `GET` | `/api/incidents` | 1, 3 — list, filter, search, sort |
| `GET` | `/api/incidents/{id}` | 1 — incident detail |
| `PATCH` | `/api/incidents/{id}` | 2 — status, owner, severity, service |
| `POST` | `/api/incidents/{id}/rca` | 4 — generate RCA |
| `GET` | `/api/incidents/{id}/rca` | 4 — read RCA |
| `PUT` | `/api/incidents/{id}/rca` | 4 — edit RCA |
| `GET` | `/api/incidents/{id}/related` | 6 — suggested related incidents with reasons |
| `GET` | `/api/incidents/{id}/links` | 6 — confirmed related incidents |
| `POST` | `/api/incidents/{id}/links` | 6 — link a related incident |
| `GET` | `/api/sla` | 5 — SLA state for every incident |
| `GET` | `/api/sla/{id}` | 5 — SLA state for one incident |
| `GET` | `/api/dashboard` | 3, 5 — dashboard metrics |

`GET /api/incidents` query parameters:
`status`, `severity`, `owner`, `service`, `q`, `sla`, `sort_by`, `order`.

### Web UI

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Landing page |
| `GET` | `/dashboard` | Dashboard |
| `GET` | `/incidents` | Filterable incident list |
| `GET` `POST` | `/incidents/new` | Creation form |
| `GET` | `/incidents/{id}` | Detail, SLA panel, timeline |
| `POST` | `/incidents/{id}/update` | Lifecycle and ownership updates |
| `GET` | `/incidents/{id}/rca` | View and edit RCA |
| `POST` | `/incidents/{id}/rca/generate` | Generate or regenerate RCA |
| `POST` | `/incidents/{id}/rca` | Save RCA edits |
| `POST` | `/incidents/{id}/link` | Link a suggested related incident |

---

## 5. Domain rules

### Severity and SLA targets

| Severity | Meaning | SLA target |
| --- | --- | --- |
| `P1` | Critical | 2 hours |
| `P2` | High | 4 hours |
| `P3` | Medium | 8 hours |

### Lifecycle

```text
OPEN → INVESTIGATING → MITIGATED → CLOSED
                                      └── reopen ──→ OPEN
```

Progress is one step forward at a time. The only backward move is reopening a
`CLOSED` incident, which returns it to `OPEN`, clears `resolvedAt`, resets the
escalation flag and appends a `REOPENED` timeline entry. Because the deadline is
always derived from `createdAt`, a reopened incident resumes SLA tracking against
its original creation time and may breach immediately.

Any other transition is rejected with a message naming both states, for example:

```text
Invalid status transition: OPEN → CLOSED. Allowed from OPEN: INVESTIGATING.
Invalid status transition: MITIGATED → OPEN. Allowed from MITIGATED: CLOSED.
Invalid status transition: CLOSED → INVESTIGATING. Allowed from CLOSED: OPEN.
```

Setting the status to its current value is a no-op, not an error.

### SLA evaluation

Evaluated on read, never stored, so it always reflects the current severity.
Rules are applied in this order:

1. Status is `CLOSED` → `NOT_APPLICABLE` (labelled *Resolved within SLA* or
   *Resolved after SLA deadline*; elapsed time freezes at `resolvedAt`)
2. `createdAt` missing or unparseable → `NOT_APPLICABLE` with a warning
3. Remaining time ≤ 0 → `SLA_BREACHED`
4. Remaining time ≤ 25% of target → `APPROACHING_SLA`
5. Otherwise → `WITHIN_SLA`

The deadline is always `createdAt + SLA(current severity)`, so changing severity
after creation moves the deadline and can flip an incident straight to breached.

### Escalation

On the first detection of a breach the platform appends an `ESCALATION` timeline
entry, sets the `escalated` flag, highlights the row in red, lists the incident in
a dashboard warning banner, and surfaces a reassignment recommendation. The check
runs lazily on every read, so no background scheduler is needed, and it is
idempotent — one entry per breach episode. If the severity is later lowered and
the incident is no longer breached the flag resets, so a subsequent re-breach
escalates again.

### Related incident detection

A candidate is suggested when it shares at least one of: the impacted service, a
title keyword, two or more description keywords, an error code (`504`, `ORA-1234`,
`E1234`), or a failure category (timeout, database, deployment, capacity, network,
authentication, data-integrity). Creation within 120 minutes adds weight and a
reason, but never qualifies a match on its own. Every suggestion carries the list
of rules that matched it, and suggestions are ordered by score.

Links are symmetric and stored on both incidents as `relatedIncidents`, with a
`LINKED` timeline entry on each. An incident cannot be linked to itself and the
same pair cannot be linked twice in either direction.

---

## 6. Project structure

```text
app/
  main.py               FastAPI app, router registration, startup hook
  config.py             Paths; INCIDENT_DATA_DIR env override
  models.py             Enums and Pydantic models
  storage.py            JsonStore: atomic writes, thread lock, per-path registry
  errors.py             Domain errors mapped to HTTP codes by routers
  templating.py         Shared Jinja2 environment and filters
  utils/time.py         UTC helpers; every timestamp passes through these
  services/             All business rules
    incidents.py        Create, update, transitions, query
    dashboard.py        Pure metric computation and donut geometry
    rca.py              Rule-based RCA generation
    related.py          Related-incident detection and linking
    sla.py              SLA calculation and escalation
  routers/              Thin controllers, no business logic
  templates/            Jinja2 templates
  static/css/           Hand-written stylesheet
data/                   incidents.json, rca.json
scripts/                seed.py, e2e_check.py
tests/                  190 tests
```

Business rules live only in `app/services/`. The JSON API and the HTML UI are
both thin callers, so a rule cannot be correct in one and wrong in the other.

---

## 7. Minimum deliverables

| # | Deliverable | Where to see it |
| --- | --- | --- |
| 1 | Runnable application | `uvicorn app.main:app --reload` |
| 2 | Incident creation and listing | `/incidents/new`, `/incidents` |
| 3 | Incident detail view | `/incidents/INC-0001` |
| 4 | Status and ownership updates | Update form on the detail page |
| 5 | Invalid status transition rejected | Select a closed incident, or `PATCH` `OPEN → CLOSED` |
| 6 | Dashboard metrics | `/dashboard` |
| 7 | Two or more filters / smart views | Five filters, search, two sorts on `/incidents` |
| 8 | RCA generation | `/incidents/INC-0001/rca` |
| 9 | SLA calculation for an active incident | SLA panel on any open incident; `/api/sla` |
| 10 | Evidence of GitHub Copilot usage | [docs/copilot-usage.md](docs/copilot-usage.md) and the exported session transcript `docs/copilot-session.md` |

## 8. Technology choices

| Decision | Reason |
| --- | --- |
| FastAPI + Jinja2 | One process serves a real REST API *and* a presentable UI; Pydantic gives declarative validation and `/docs` for free |
| JSON file storage | No database to install or run; atomic writes plus an in-process lock keep it safe |
| Inline SVG chart | No CDN or JavaScript library; the app runs fully offline |
| Plain GET forms for filters | No client-side state; URLs stay bookmarkable and the back button works |
| SLA computed on read | Cannot go stale when severity changes; no scheduler required |
