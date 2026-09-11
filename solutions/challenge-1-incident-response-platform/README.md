# Challenge 1 Solution: Signal Room

This folder is the contribution package for:

[Challenge 1: Incident Response and Root Cause Analysis Platform](https://github.com/adityarajsahoowipro/GitHub-Copilot-Hands-on-Lab-Challenges/blob/main/New%20Problem%20Statements/challenge-1-incident-response-platform.md)

## Solution Summary

Signal Room is a browser-based incident command center for engineering teams. It brings incident intake, ownership, lifecycle control, SLA monitoring, responder activity, RCA drafting, and related-incident signals into one operational workspace.

The solution is intentionally frontend-first and uses browser persistence, which is permitted by the challenge. It is runnable without a database or external services.

## Feature Ladder Coverage

| Challenge feature | Signal Room implementation |
| --- | --- |
| Feature 0 | Next.js application with a runnable command center |
| Feature 1 | Incident creation, unique IDs, validation, listing, and details |
| Feature 2 | Ownership controls and guarded lifecycle transitions |
| Feature 3 | Metrics, severity/status filters, search, SLA views, and visual indicators |
| Feature 4 | Editable rule-based RCA draft generation |
| Feature 5 | P1/P2/P3 SLA monitoring, approaching/breached states, escalation timeline events |
| Optional extension | Related incidents by impacted service and shared incident keywords |
| Additional workflow | Reopen a resolved incident within 24 hours |

## Demonstration Flow

1. Create a new incident and assign an owner.
2. Show the incident in the command center and detail workspace.
3. Perform a valid lifecycle transition.
4. Attempt an invalid transition and show the rejection message.
5. Filter by SLA status and show an approaching or breached incident.
6. Raise an escalation and show it in the response timeline.
7. Generate and edit the RCA draft.
8. Add a responder note and show the activity/timeline update.
9. Select `INC-1042` and demonstrate `INC-1043` and `INC-1044` as related incidents.
10. Select `INC-1035` and demonstrate the 24-hour reopen behavior.

## Copilot Usage

GitHub Copilot was used incrementally for:

- Requirement analysis and Feature Ladder planning
- Frontend component generation
- Incident validation and lifecycle state rules
- SLA calculations and escalation behavior
- RCA workflow design
- Responsive command-center UI
- Browser interaction verification
- Debugging build and deployment issues
- README and architecture documentation

The solution was developed feature by feature, with generated code reviewed and validated before moving to the next feature.

## Run

From the solution root:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Production/static validation:

```bash
npm run build
npm run pages:build
```

## Storage and Scope

- Demo incidents and responder activity are persisted in browser `localStorage`.
- No confidential, client, or production data is included.
- The repository also contains a Spring Boot/PostgreSQL foundation, but the challenge demonstration does not require backend services.

## Contribution Note

This package is intended to be added to a fork of the challenge repository under:

```text
solutions/challenge-1-incident-response-platform/
```

The original problem statement remains unchanged. Submit it through a pull request from a feature branch to the upstream repository's `main` branch.
