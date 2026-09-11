"""Ad-hoc end-to-end check against a running server. Not part of the pytest suite."""

import json
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8012"
passed = failed = 0


def call(method, path, body=None, form=None):
    url = BASE + path
    headers = {}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    elif form is not None:
        data = urllib.parse.urlencode(form).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as response:
            return response.status, response.read().decode()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode()


def check(label, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  PASS  {label}")
    else:
        failed += 1
        print(f"  FAIL  {label}  {detail}")


print("\n== Feature 0: startup ==")
code, text = call("GET", "/health")
check("/health returns 200 ok", code == 200 and json.loads(text)["status"] == "ok", text)
code, text = call("GET", "/")
check("landing shows title", code == 200 and "Incident Response Platform" in text)
check("/docs loads", call("GET", "/docs")[0] == 200)
check("stylesheet served", call("GET", "/static/css/styles.css")[0] == 200)

print("\n== Feature 1: incident management ==")
code, text = call("GET", "/api/incidents")
if json.loads(text):
    sys.exit(
        "ABORT: this script requires an empty data store.\n"
        "  Stop the server, delete data/incidents.json, restart, then re-run."
    )
check("list starts empty", json.loads(text) == [], text)

code, text = call(
    "POST",
    "/api/incidents",
    {
        "title": "Checkout service unavailable",
        "description": "Repeated database connection failures.",
        "severity": "P1",
        "impactedService": "Checkout Service",
    },
)
first = json.loads(text)
check("created with 201", code == 201, text)
check("id is INC-0001", first["incidentId"] == "INC-0001")
check("initial status OPEN", first["status"] == "OPEN")
check("owner unassigned", first["owner"] is None)
check("timestamps recorded", bool(first["createdAt"]) and bool(first["updatedAt"]))
check("CREATED timeline entry", first["timeline"][0]["type"] == "CREATED")

code, text = call(
    "POST",
    "/api/incidents",
    {"title": "Order latency spike", "severity": "P2", "impactedService": "Order Service"},
)
check("second id is INC-0002", json.loads(text)["incidentId"] == "INC-0002")

check("list has 2", len(json.loads(call("GET", "/api/incidents")[1])) == 2)
code, text = call("GET", "/api/incidents/INC-0001")
check("detail by id", code == 200 and json.loads(text)["title"] == "Checkout service unavailable")
code, text = call("GET", "/api/incidents/INC-9999")
check("unknown id 404", code == 404 and "INC-9999" in text)

print("\n-- validation --")
for label, payload in [
    ("empty title", {"title": "", "severity": "P1", "impactedService": "S"}),
    ("whitespace title", {"title": "   ", "severity": "P1", "impactedService": "S"}),
    ("missing severity", {"title": "T", "impactedService": "S"}),
    ("bad severity", {"title": "T", "severity": "P9", "impactedService": "S"}),
    ("missing service", {"title": "T", "severity": "P1", "impactedService": ""}),
]:
    check(f"{label} rejected", call("POST", "/api/incidents", payload)[0] == 422)

code, text = call(
    "POST",
    "/incidents/new",
    form={"title": "", "severity": "", "impactedService": "Kept Service", "owner": "Arun"},
)
check("web form returns 400", code == 400)
check("title error shown", "Incident title must not be empty." in text)
check("severity error shown", "Severity must be selected" in text)
check("previous input preserved", "Kept Service" in text)

print("\n== Feature 2: lifecycle and ownership ==")
code, text = call("PATCH", "/api/incidents/INC-0001", {"status": "CLOSED"})
check("OPEN->CLOSED rejected 400", code == 400, text)
check("message names both states", "OPEN" in text and "CLOSED" in text)
check("message lists allowed", "Allowed from OPEN: INVESTIGATING" in text)

check(
    "rejected update left status OPEN",
    json.loads(call("GET", "/api/incidents/INC-0001")[1])["status"] == "OPEN",
)

code, text = call("PATCH", "/api/incidents/INC-0001", {"owner": "Priya"})
check("owner assigned", json.loads(text)["owner"] == "Priya", text)

code, text = call("PATCH", "/api/incidents/INC-0001", {"status": "INVESTIGATING"})
check("OPEN->INVESTIGATING ok", code == 200 and json.loads(text)["status"] == "INVESTIGATING")
check("resolvedAt still null", json.loads(text)["resolvedAt"] is None)

code, text = call("PATCH", "/api/incidents/INC-0001", {"severity": "P2"})
check("severity updated", json.loads(text)["severity"] == "P2")
code, text = call("PATCH", "/api/incidents/INC-0001", {"impactedService": "Payment Service"})
check("service updated", json.loads(text)["impactedService"] == "Payment Service")

code, text = call("PATCH", "/api/incidents/INC-0001", {"status": "MITIGATED"})
check("INVESTIGATING->MITIGATED ok", code == 200)
code, text = call("PATCH", "/api/incidents/INC-0001", {"status": "OPEN"})
check("MITIGATED->OPEN rejected", code == 400 and "Allowed from MITIGATED: CLOSED" in text)

code, text = call("PATCH", "/api/incidents/INC-0001", {"status": "CLOSED"})
closed = json.loads(text)
check("MITIGATED->CLOSED ok", code == 200 and closed["status"] == "CLOSED")
check("resolvedAt set on close", closed["resolvedAt"] is not None)

code, text = call("PATCH", "/api/incidents/INC-0001", {"status": "INVESTIGATING"})
check("CLOSED->INVESTIGATING rejected", code == 400)
check("reopen wording", "Allowed from CLOSED: OPEN" in text, text)

code, text = call("PATCH", "/api/incidents/INC-0001", {"status": "OPEN"})
reopened = json.loads(text)
check("CLOSED->OPEN reopens", code == 200 and reopened["status"] == "OPEN")
check("resolvedAt cleared on reopen", reopened["resolvedAt"] is None)
check("REOPENED entry appended", reopened["timeline"][-1]["type"] == "REOPENED")
code, text = call("PATCH", "/api/incidents/INC-0001", {"status": "CLOSED"})
check("OPEN->CLOSED still rejected after reopen", code == 400)
call("PATCH", "/api/incidents/INC-0001", {"status": "INVESTIGATING"})
call("PATCH", "/api/incidents/INC-0001", {"status": "MITIGATED"})
code, text = call("PATCH", "/api/incidents/INC-0001", {"status": "CLOSED"})
check("reopened incident can close again", code == 200)

code, text = call("PATCH", "/api/incidents/INC-0002", {"status": "OPEN"})
check("same-status is a no-op 200", code == 200)
check(
    "no-op added no timeline entry",
    [e["type"] for e in json.loads(text)["timeline"]] == ["CREATED"],
)

check("update unknown id 404", call("PATCH", "/api/incidents/INC-9999", {"owner": "X"})[0] == 404)

print("\n-- web UI --")
code, _ = call(
    "POST",
    "/incidents/INC-0002/update",
    form={"status": "CLOSED", "severity": "P2", "impactedService": "Order Service", "owner": ""},
)
check("web invalid transition 400", code == 400)

text = call("GET", "/incidents/INC-0002")[1]
check("dropdown offers only INVESTIGATING", "Move to INVESTIGATING" in text)
check("dropdown hides CLOSED", "Move to CLOSED" not in text)
text = call("GET", "/incidents/INC-0001")[1]
check("closed incident offers reopen", "Reopen incident" in text)
check("closed incident hides forward transitions", "Move to" not in text)
check("resolved card rendered", "Resolved" in text)

text = call("GET", "/incidents")[1]
check("list page shows both", "INC-0001" in text and "INC-0002" in text)
check("severity badge rendered", "sev-P2" in text)
check("status badge rendered", "status-CLOSED" in text)
check("web 404 page", call("GET", "/incidents/INC-9999")[0] == 404)

print("\n-- timeline ordering --")
timeline = json.loads(call("GET", "/api/incidents/INC-0001")[1])["timeline"]
types = [entry["type"] for entry in timeline]
expected = [
    "CREATED",
    "OWNER_CHANGED",
    "STATUS_CHANGED",
    "SEVERITY_CHANGED",
    "SERVICE_CHANGED",
    "STATUS_CHANGED",
    "STATUS_CHANGED",
    "REOPENED",
    "STATUS_CHANGED",
    "STATUS_CHANGED",
    "STATUS_CHANGED",
]
check("timeline matches actions", types == expected, str(types))

print("\n-- persistence --")
with open("data/incidents.json", encoding="utf-8") as handle:
    stored = json.load(handle)
check("2 incidents on disk", len(stored) == 2)
check("timestamps stored as ISO Z", stored[0]["createdAt"].endswith("Z"))

print(f"\n{'=' * 46}\n  {passed} passed, {failed} failed\n{'=' * 46}")
sys.exit(1 if failed else 0)
