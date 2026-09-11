# Incident Response and Root Cause Analysis Platform

## Project Overview

A full-stack demo application for engineering teams to track production incidents,
control their lifecycle, monitor SLA compliance, and produce Root Cause Analysis (RCA)
reports. All data is fictional and stored locally in JSON files — no database server,
authentication, or external services are required.

## Problem Solved

When an incident occurs, teams need a single place to:
- Log the incident with severity and ownership.
- Move it through a controlled lifecycle (no skipping steps).
- See at a glance whether it is at risk of breaching its SLA.
- Capture a structured RCA once the incident is understood.
- Spot other incidents that might be related.

## Features

- Incident CRUD with strict validation.
- Enforced lifecycle: `OPEN → INVESTIGATING → MITIGATED → CLOSED` (no skipping or reverting).
- Full activity history/timeline per incident.
- SLA calculation (P1 = 2h, P2 = 4h, P3 = 8h) computed on demand, never stored stale.
- Explicit `POST /api/incidents/evaluate-sla` endpoint that records SLA breaches once.
- Dashboard with status/severity/SLA metrics and a filterable/sortable incident table.
- Recharts bar charts for status and severity breakdowns.
- RCA generation (deterministic draft, no external AI), review/edit workflow.
- Optional related-incident suggestions and manual linking.
- Centralized error handling with a consistent JSON response shape.

## Technology Stack

**Frontend:** React + Vite, JavaScript, React Router, Axios, Recharts, plain CSS, Vitest, React Testing Library
**Backend:** Node.js, Express.js (ES modules), local JSON file storage, uuid, cors, Jest, Supertest

## Architecture

```
client (Vite dev server, port 5173) --/api proxy--> server (Express, port 5000) --> JSON files
```

- **Routes** parse HTTP input only.
- **Controllers** call services and shape HTTP responses.
- **Services** hold all business logic (validation orchestration, lifecycle rules, SLA math).
- **Repositories** are the only code that touches the JSON files on disk.
- **Validators** and **utils** (SLA calculator, ID generator, history builder) are pure and reusable.

## Folder Structure

```
incident-response-platform/
  client/
    src/
      components/   # Badges, Layout, Timeline, Dialog, Notification, SLA display
      pages/        # Landing, Dashboard, IncidentList, CreateIncident, IncidentDetail, RCA
      services/     # Axios client + API call wrappers
      hooks/         # useDebouncedValue, useConfirm, useNotification
      utils/        # formatters, constants
  server/
    src/
      controllers/  # HTTP request/response glue
      routes/       # Express routers
      services/     # Business logic (incidents, SLA, dashboard, RCA, related)
      repositories/ # JSON file access
      middleware/   # error handler, 404 handler, request logger
      validators/   # input validation
      utils/        # SLA calculator, ID generator, history builder, file store, seed script
      data/         # incidents.json, rcas.json, links.json (created automatically)
    tests/          # Jest + Supertest, run against an isolated tmp-data directory
  package.json      # root scripts (dev/build/test/seed)
  README.md
```

## Prerequisites

- Node.js 18+ (developed and tested on Node 22)
- npm 9+

## Installation

```bash
npm run install:all
```

This installs the root, `client`, and `server` dependencies.

## Running Instructions

```bash
npm run dev
```

Starts both the backend (port 5000) and frontend (Vite dev server, default port 5173) together
using `concurrently`. The frontend proxies `/api/*` requests to the backend, so no hardcoded
backend URL is used in frontend code.

Run them individually if preferred:
```bash
npm run server   # backend only, http://localhost:5000
npm run client   # frontend only, http://localhost:5173
```

## Seed Command

```bash
npm run seed
```

Writes fictional sample incidents (`server/src/data/incidents.json`) demonstrating every SLA
state: within SLA, approaching SLA, breached, and closed (not applicable). Existing data is
preserved unless you force an overwrite:

```bash
npm run seed --prefix server -- --force
```

## Test Commands

```bash
npm test            # runs backend then frontend test suites
npm run test:server # Jest + Supertest (44 tests)
npm run test:client # Vitest + React Testing Library (14 tests)
```

Backend tests point at an isolated `server/tests/tmp-data` directory (via the `DATA_DIR`
environment variable) and never touch your real `server/src/data` files.

## Build Command

```bash
npm run build
```

Runs `vite build` for the client and produces a production bundle in `client/dist`.

## API Documentation

All responses follow one of these shapes:

```json
{ "success": true, "data": { } }
{ "success": false, "message": "Clear error message", "errors": [] }
```

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/incidents` | Create an incident (status forced to OPEN) |
| GET | `/api/incidents` | List incidents; supports `status`, `severity`, `owner`, `impactedService`, `search`, `sortBy`, `order`, `slaStatus` |
| GET | `/api/incidents/:incidentId` | Get one incident (includes computed `sla` object) |
| PATCH | `/api/incidents/:incidentId` | Update `status`, `owner`, `severity`, `impactedService` |
| POST | `/api/incidents/evaluate-sla` | Scans active incidents and records new SLA breaches |
| GET | `/api/incidents/:incidentId/related` | Suggests possibly-related incidents with reasons |
| POST | `/api/incidents/:incidentId/link/:relatedIncidentId` | Confirms a symmetric link |
| POST | `/api/incidents/:incidentId/rca/generate` | Generates a draft RCA (409 if one exists) |
| GET | `/api/incidents/:incidentId/rca` | Retrieves the RCA |
| PUT | `/api/incidents/:incidentId/rca` | Updates the RCA |
| GET | `/api/dashboard/metrics` | Totals by status, severity, and SLA state |

## Data Models

**Incident**
```json
{
  "incidentId": "INC-1001",
  "title": "string",
  "description": "string",
  "severity": "P1 | P2 | P3",
  "status": "OPEN | INVESTIGATING | MITIGATED | CLOSED",
  "owner": "string",
  "impactedService": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "history": [ { "type": "string", "message": "string", "timestamp": "ISO date", "previousValue": "any", "newValue": "any" } ],
  "sla": { "targetHours": 2, "elapsedMilliseconds": 0, "remainingMilliseconds": 0, "deadline": "ISO date", "status": "string", "requiresEscalation": false, "message": "string" }
}
```

**RCA**
```json
{
  "incidentId": "string",
  "incidentSummary": "string",
  "rootCause": "string",
  "impactedServices": ["string"],
  "resolution": "string",
  "lessonsLearned": "string",
  "recommendations": ["string"],
  "generatedAt": "ISO date",
  "updatedAt": "ISO date"
}
```

## Lifecycle Rules

Only these forward transitions are valid: `OPEN → INVESTIGATING`, `INVESTIGATING → MITIGATED`,
`MITIGATED → CLOSED`. Any other transition (e.g. `OPEN → CLOSED`, `CLOSED → INVESTIGATING`,
`MITIGATED → OPEN`) is rejected with HTTP 409. The backend is the sole authority on lifecycle
validation.

## SLA Rules

- Targets: P1 = 2h, P2 = 4h, P3 = 8h.
- `WITHIN_SLA`: more than 25% of the target time remains.
- `APPROACHING_SLA`: 25% or less remains and the deadline has not passed.
- `SLA_BREACHED`: the deadline has passed.
- `NOT_APPLICABLE`: the incident is CLOSED, or its timestamp/severity is invalid.
- SLA is always computed at request time from `createdAt` and `severity` — never stored as a
  stale value. `POST /api/incidents/evaluate-sla` is the only endpoint that writes an
  `SLA_BREACHED` history entry, and it never writes a duplicate one for the same incident.

## RCA Behavior

RCA generation builds a deterministic draft from the incident's title, description, severity,
and impacted service — it never invents a confirmed root cause and always states that findings
must be reviewed. Generating an RCA when one already exists returns HTTP 409 rather than silently
overwriting it. Every generation or update appends an `RCA_GENERATED`/`RCA_UPDATED` entry to the
incident's history.

## Sample Demonstration Flow

1. Run `npm run seed` then `npm run dev`.
2. Visit `http://localhost:5173/` — confirm "Backend connected".
3. Open the Dashboard to see metrics and charts for the 5 seeded incidents.
4. Open `INC-1001` (P1, breached SLA) — see the escalation warning and lifecycle progress.
5. Click "Start Investigation", confirm the dialog, and watch the timeline update.
6. Go to its RCA page and click "Generate RCA" to see the draft, then edit and save it.
7. Return to the incident list and filter by `slaStatus=SLA_BREACHED`.

## Known Limitations

- No authentication/authorization — anyone with network access can modify data.
- JSON file storage is not safe for concurrent multi-process writes at scale.
- Related-incident detection uses simple keyword/service heuristics, not NLP.
- No pagination on the incident list (acceptable for demo-scale data).

## Future Enhancements

- Add pagination and virtualized tables for large incident volumes.
- Add authentication and role-based permissions (e.g. only owners can close incidents).
- Replace JSON file storage with a real database for concurrent-safe writes.
- Add email/webhook notifications on SLA breach.

## GitHub Copilot Usage

This project was built with GitHub Copilot (Claude Sonnet) assisting in scaffolding,
implementing backend/frontend code, and writing tests, under direct human review and
instruction throughout.

## Privacy Statement

No confidential, client, employee, or production data is used anywhere in this project.
All incident and RCA content is fictional sample data created for demonstration only.

## Troubleshooting

- **"Cannot find module" errors after cloning**: run `npm run install:all` from the repo root.
- **Frontend shows "Backend unavailable"**: make sure `npm run server` (or `npm run dev`) is
  running on port 5000, and that nothing else is bound to that port.
- **Port already in use**: stop any other process on port 5000 or 5173, or set `PORT` env var
  for the server.
- **Tests fail with file permission errors**: ensure `server/tests/tmp-data` is writable; it is
  created automatically and is safe to delete.
- **Seed does nothing**: `incidents.json` already has data; re-run with `--force` to overwrite.
