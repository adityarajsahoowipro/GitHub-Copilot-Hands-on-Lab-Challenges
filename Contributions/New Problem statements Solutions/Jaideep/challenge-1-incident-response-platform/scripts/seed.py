"""Seed demo incidents for manual UI walkthroughs."""

import json
import sys
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"

# hours_ago backdates createdAt so the SLA states are varied and visible.
INCIDENTS = [
    ("Checkout service unavailable", "P1", "Checkout Service", "Priya",
     "Repeated database connection failures after the 14:00 deploy.", [], 5),
    ("Payment gateway timeouts", "P1", "Payment Service", "Arun",
     "Upstream provider returning 504s on ~30% of requests.", ["INVESTIGATING"], 1.75),
    ("Order confirmation delays", "P2", "Order Service", "Priya",
     "Queue backlog pushing confirmation emails past 10 minutes.",
     ["INVESTIGATING", "MITIGATED"], 1),
    ("Search results degraded", "P2", "Search Service", None,
     "Relevance ranking service returning partial results.", [], 6),
    ("Cart totals incorrect", "P2", "Cart Service", "Arun",
     "Rounding error on multi-currency carts.",
     ["INVESTIGATING", "MITIGATED", "CLOSED"], 3),
    ("Login page slow to load", "P3", "Auth Service", None,
     "p95 latency up from 200ms to 1.4s.", [], 0.5),
]


def request(method, path, body):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method=method,
    )
    with urllib.request.urlopen(req) as response:
        return json.load(response)


def backdate(incident_id, hours):
    """Rewrite createdAt directly in the store; the API deliberately has no such field."""
    from datetime import datetime, timedelta, timezone
    from pathlib import Path

    path = Path("data/incidents.json")
    records = json.loads(path.read_text())
    stamp = datetime.now(timezone.utc) - timedelta(hours=hours)
    for record in records:
        if record["incidentId"] == incident_id:
            record["createdAt"] = stamp.isoformat().replace("+00:00", "Z")
    path.write_text(json.dumps(records, indent=2))


created = []
for title, severity, service, owner, description, path, hours_ago in INCIDENTS:
    body = {
        "title": title,
        "severity": severity,
        "impactedService": service,
        "description": description,
    }
    if owner:
        body["owner"] = owner
    incident = request("POST", "/api/incidents", body)
    for target in path:
        request("PATCH", f"/api/incidents/{incident['incidentId']}", {"status": target})
    created.append((incident["incidentId"], severity, path[-1] if path else "OPEN", title, hours_ago))

print("Restart the server after seeding so backdated timestamps are reloaded.\n")
for incident_id, severity, state, title, hours_ago in created:
    backdate(incident_id, hours_ago)
    print(f"  {incident_id}  {severity}  {state:13}  {hours_ago}h ago  {title}")

print(f"\nSeeded {len(INCIDENTS)} incidents at {BASE}")
