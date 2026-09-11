# Deliverable #10 — GitHub Copilot Usage Evidence

This records how GitHub Copilot (agent mode) was used to build the Incident Response
and Root Cause Analysis Platform.

The project was built in six phases. Each phase was prompted separately, implemented,
tested and verified before the next began — matching the brief's instruction to
*"build and test the application feature by feature"* and *"test generated code before
moving to the next feature."*

**Result:** 43 source files, 165 automated tests, 55 end-to-end checks, all 10 minimum
deliverables satisfied.

> **Note:** `copilot-session.md` is the exported chat transcript and is the primary
> evidence for this deliverable. Export it via Command Palette →
> **Chat: Export Chat...** before submitting.

---

## 1. Primary evidence — full session transcript

The complete Copilot conversation that produced this project is exported to:

**[`copilot-session.md`](copilot-session.md)**

It contains every prompt and every response across all six phases, in order — the
planning discussion, each feature request, the generated code, the test runs, and the
bugs found and fixed along the way.

### How it was exported

VS Code Command Palette (`Cmd+Shift+P`) → **Chat: Export Chat...** → save as
`docs/copilot-session.md`.

### What to look for in it

| Section of the transcript | Demonstrates |
| --- | --- |
| Opening planning exchange | Copilot breaking the brief into six testable phases |
| "Why did you choose FastAPI + Jinja2" | Explaining and justifying a technical decision |
| Each phase request | Generating a complete feature from a numbered specification |
| Test output after each phase | Testing generated code before moving on, as the brief requires |
| Phase 2, 5 and 6 corrections | Reviewing and improving its own output |

---

## 2. Optional supporting screenshots

Not required — the transcript above is the evidence. These simply make the submission
more presentable. Save to `docs/img/` and embed with
`![Dashboard](img/app-01-dashboard.png)`.

Start the server with seeded data first:

```bash
uvicorn app.main:app --reload
python scripts/seed.py http://127.0.0.1:8000   # then restart the server
```

| Filename | URL | Shows |
| --- | --- | --- |
| `app-01-dashboard.png` | `/dashboard` | Metrics, SVG donut chart, SLA breach banner |
| `app-02-incident-list.png` | `/incidents?sort_by=severity&order=asc` | Filters, badges, breached rows highlighted |
| `app-03-incident-detail-sla.png` | `/incidents/INC-0001` | SLA panel and `ESCALATION` timeline entry |
| `app-04-rca-report.png` | `/incidents/INC-0005/rca` | Generated RCA report |

For an invalid-transition screenshot, use Swagger UI at `/docs` — the dropdown only
offers legal statuses, so the rejection has to come from the API:

`PATCH /api/incidents/INC-0001` with `{"status": "CLOSED"}` → **400**

```text
Invalid status transition: OPEN → CLOSED. Allowed from OPEN: INVESTIGATING.
```

---

## 3. Phase-by-phase summary

A condensed index of the transcript, for readers who do not want to read it in full.

### Planning

**Prompt:** Supplied the full brief and asked for a detailed plan, explicitly requesting
the difficulties likely to be encountered.

**Output:** A six-phase plan with a technology comparison (FastAPI + Jinja2 vs Streamlit
vs Django vs Flask vs a JS frontend), file layout, and anticipated pitfalls — timezone
handling, Pydantic v2 differences, atomic JSON writes, route ordering, test isolation.
Several of these did occur later, and the mitigations were already designed in.

**Follow-up:** *"Why did you choose FastAPI + Jinja2 among others"* — produced the
justification now summarised in the README.

### Phase 0 — Skeleton and health check

Generated the project tree, `requirements.txt`, config, app entrypoint, `/health`,
landing page, and a stylesheet written up front with the classes later phases needed.

Two decisions Copilot made unprompted:

- Used the `lifespan` context manager instead of the deprecated `@app.on_event`.
- Made `get_data_dir()` read its env override **at call time**, which is why
  `tests/conftest.py` is five lines and needs no `importlib.reload`.

### Phase 1 — Data model, storage, CRUD

Generated 8 files and 19 tests. Notable output: `Annotated[str, BeforeValidator(...)]`
so "title must not be empty" is declared once and enforced in both the API and the form;
atomic writes via `tempfile.mkstemp` + `os.replace`; and `/incidents/new` declared
**before** `/incidents/{incident_id}` with a comment explaining why.

### Phase 2 — Lifecycle and ownership

Generated the transition table and 26 tests. `update_incident()` collects all changes
before writing, so a rejected transition aborts the whole update rather than
half-applying an owner change.

**Bug Copilot caught in its own output:** the terminal-status message read
*"Allowed from CLOSED: CLOSED is a terminal status."* — grammatically broken. It rewrote
`_transition_error()` to branch on whether any transitions exist.

### Phase 3 — Dashboard, filters, chart

Generated 38 tests, five filters (two were required), two sorts, and a hand-rolled SVG
donut using `stroke-dasharray` — avoiding a Chart.js CDN, per the "no extra resources"
constraint.

**Bug found only in a screenshot:** the table wrapped `INC-` across two lines. No
assertion would have caught it.

### Phase 4 — RCA generator

Generated rule tables keyed on severity and status, plus 31 tests.

**Design decision Copilot argued for:** warnings are **never persisted** and are
recomputed on every read — storing them would leave an incident that later closes
permanently displaying "still OPEN". It also declined to fabricate a root cause for an
unresolved incident, emitting "Root cause has not been established" instead.

### Phase 5 — SLA monitoring and escalation

Generated 47 tests covering every edge case named in the brief: severity upgrade and
downgrade, closed-early, corrupt timestamp, naive datetime, the 25% boundary, and
escalation idempotency.

**Two bugs found during visual verification:**

1. `.title()` rendered `SLA_BREACHED` as "Sla Breached" — replaced with an explicit
   `STATUS_LABELS` map.
2. Breached rows read "3h 01m overdue **left**" — the suffix is now conditional.

**A test Copilot wrote wrongly, then corrected:** it asserted a P2 incident 3 hours into
a 4-hour target was `WITHIN_SLA`. That is *exactly* 25% remaining, which the brief
defines as `APPROACHING_SLA`. The implementation was right; the test was fixed.

---

## 4. How Copilot was used

The brief asked to *"generate, explain, review, test, and improve"* the implementation.

| Activity | Example |
| --- | --- |
| **Generate** | Whole features from a numbered specification |
| **Explain** | Justifying the stack against four alternatives |
| **Review** | Catching the broken terminal-status sentence and the acronym casing |
| **Test** | 165 tests, including every edge case named in the brief |
| **Improve** | Making warnings computed rather than stored; making escalation idempotent per breach episode |

---

## 5. Verification

Three independent layers were used at every phase:

```text
pytest tests/ -q                     165 passed
python scripts/e2e_check.py <url>     55 passed   (live server)
Playwright screenshots                            (anything visual)
```

The third layer mattered: the table-wrapping bug, the "Sla Breached" casing and the
"overdue left" phrasing were all invisible to the first two.
