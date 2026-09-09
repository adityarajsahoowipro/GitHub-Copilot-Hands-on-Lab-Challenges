# 🚨 Challenge 1: Incident Response and Root Cause Analysis Platform

## ⏱️ Hands-on Build Time

1 hour

---

## 1. Problem Statement

Engineering teams must respond quickly when production systems experience outages, performance degradation, or service failures. Tracking incidents manually makes it difficult to identify ownership, monitor progress, understand impact, and document the final resolution.

Build an **Incident Response and Root Cause Analysis Platform** that enables engineering teams to:

- Create and track production incidents
- Assign severity and ownership
- Manage the incident lifecycle
- Monitor incidents using a dashboard
- Generate a structured Root Cause Analysis report
- Maintain a timeline of important incident activities

The solution should be developed incrementally using **GitHub Copilot**. Participants should break the requirements into smaller tasks and use Copilot to generate, explain, review, test, and improve the implementation.

---

## 2. Outcomes Expected

By completing this challenge, participants should demonstrate:

- A runnable and presentable incident management application
- Incident creation, viewing, updating, and tracking
- Controlled incident status transitions
- Dashboard metrics and visual indicators
- A structured Root Cause Analysis generator
- Input validation and meaningful error handling
- Effective use of GitHub Copilot throughout development

---

## 3. Technology Guidelines

Participants may select a suitable technology stack for the solution.

The solution may be implemented as:

- A full-stack web application
- A frontend application with mock data
- A backend API with an interactive interface

### Required development tool

- **GitHub Copilot** for application generation, code completion, explanation, debugging, testing, and refactoring

### Storage

- In-memory storage is acceptable
- Local JSON storage is acceptable
- A database is optional

> The use of external AI coding assistants is not permitted. Participants must use GitHub Copilot for this challenge.

---

## 4. Incident Data Model

Each incident should contain at least the following information:

- `incidentId`
- `title`
- `description`
- `severity`
- `status`
- `owner`
- `impactedService`
- `createdAt`
- `updatedAt`

### Supported severity levels

- `P1` – Critical
- `P2` – High
- `P3` – Medium

### Supported incident statuses

- `OPEN`
- `INVESTIGATING`
- `MITIGATED`
- `CLOSED`

---

## 5. Root Cause Analysis Data Model

Each Root Cause Analysis report should contain:

- `incidentId`
- `incidentSummary`
- `rootCause`
- `impactedServices`
- `resolution`
- `lessonsLearned`
- `recommendations`
- `generatedAt`

---

# 🪜 Feature Ladder

Participants must build the application incrementally. Complete and test each feature before proceeding to the next one.

---

## ✅ Feature 0 — Start the Application

Create and run the initial application.

The application should display either:

- A landing page with the title **Incident Response Platform**
  
or

- A health-check endpoint returning a successful response

### Definition of Done

- The application starts without errors
- The landing page or health-check endpoint works
- The initial project structure is available

---

## ✅ Feature 1 — Incident Management

Implement the core incident-management functionality.

### Requirements

- Create a new incident
- View all incidents
- View the details of a selected incident
- Assign a unique `incidentId`
- Set the initial incident status to `OPEN`
- Record creation and update timestamps

### Required validation

- Incident title must not be empty
- Severity must be selected
- Impacted service must be provided
- Incident ID must be unique

### Definition of Done

A user can create an incident and view the incident in the incident list.

---

## ✅ Feature 2 — Incident Lifecycle and Ownership

Allow incidents to move through a controlled lifecycle.

### Valid status transitions

```text
OPEN → INVESTIGATING → MITIGATED → CLOSED

```

### Requirements

- Update the incident status
- Assign or change the incident owner
- Update the incident severity
- Update the impacted service
- Record the latest update timestamp
- Prevent invalid status transitions

### Invalid transition examples

```text
OPEN → CLOSED
CLOSED → INVESTIGATING
MITIGATED → OPEN
```

### Definition of Done

A user can assign an owner and move an incident through the valid lifecycle. Invalid transitions must be rejected with a clear error message.

---

## ✅ Feature 3 — Incident Dashboard and Smart Views

Create a dashboard that provides a clear operational view of all incidents.

### Dashboard metrics

Display at least the following:

- Total number of incidents
- Open incidents
- Incidents under investigation
- Mitigated incidents
- Closed incidents
- Number of P1, P2, and P3 incidents

### Smart views

Implement at least two of the following:

- Filter incidents by status
- Filter incidents by severity
- Filter incidents by owner
- Filter incidents by impacted service
- Search incidents by title
- Sort incidents by creation date
- Sort incidents by severity

### Visual requirements

Display the incident information using suitable visual elements such as:

- Summary cards
- Status badges
- Severity indicators
- Progress bars
- At least one chart

The dashboard should update whenever incident information changes.

### Definition of Done

The dashboard displays accurate incident metrics and provides at least two working filters or smart views.

---

## ✅ Feature 4 — Root Cause Analysis Generator

Allow users to generate and maintain a structured Root Cause Analysis report for an incident.

### Requirements

The user should be able to select an incident and generate an RCA template containing:

- Incident summary
- Root cause
- Impacted services
- Resolution
- Lessons learned
- Recommendations

The initial RCA content may be generated using:

- Information already available in the incident
- Rule-based logic
- Reusable RCA templates
- Incident severity, description, and impacted service

### Example RCA output

```text
Incident Summary:
The checkout service became unavailable after repeated database connection failures.

Root Cause:
The database connection pool reached its maximum capacity.

Impacted Services:
- Checkout Service
- Order Service
- Payment Service

Resolution:
The connection pool configuration was updated and the affected services were restarted.

Lessons Learned:
The existing monitoring did not provide an early warning for connection pool exhaustion.

Recommendations:
- Add connection-pool monitoring
- Configure early-warning alerts
- Review retry and timeout settings
```

### Additional requirements

- Allow the generated RCA to be reviewed and edited
- Associate the RCA with the correct incident
- Do not generate an RCA for an unknown incident
- Display a clear message when required incident information is missing
- Record when the RCA was generated or last updated

### Definition of Done

A user can select an incident, generate a structured RCA, update its content, and view the RCA associated with that incident.

---

## ✅ Feature 5 — SLA Monitoring and Automatic Escalation

Implement SLA monitoring based on incident severity.

This feature should help the engineering team identify incidents that are approaching or exceeding their resolution deadline.

### SLA targets

Use the following target resolution times:

- `P1` incidents: 2 hours
- `P2` incidents: 4 hours
- `P3` incidents: 8 hours

### Requirements

For every active incident, calculate and display:

- Time elapsed since the incident was created
- Remaining time before the SLA deadline
- Current SLA status
- SLA deadline

### Supported SLA statuses

```text
WITHIN_SLA
APPROACHING_SLA
SLA_BREACHED
NOT_APPLICABLE
```

### SLA calculation rules

- `WITHIN_SLA`: More than 25% of the SLA time remains
- `APPROACHING_SLA`: 25% or less of the SLA time remains
- `SLA_BREACHED`: The SLA deadline has passed
- `NOT_APPLICABLE`: The incident is already closed

### Automatic escalation

If an incident breaches its SLA:

- Mark the incident as `SLA_BREACHED`
- Display a visible warning on the dashboard
- Add an escalation entry to the incident history
- Highlight the incident as requiring immediate attention
- Recommend that the incident be reassigned or escalated

### Dashboard enhancements

Add the following information to the dashboard:

- Number of incidents within SLA
- Number of incidents approaching SLA
- Number of SLA-breached incidents
- SLA status badge for every incident
- Filter incidents by SLA status

### Edge cases

Handle the following situations:

- Incident severity changes after creation
- Incident is closed before the SLA deadline
- Incident has an invalid or missing creation timestamp
- Incident is reopened after being closed
- Application time or timezone differences

### Definition of Done

The application calculates SLA status based on incident severity and creation time, displays the result clearly, and highlights breached incidents.

---

# ⭐ Optional Advanced Extension — Related Incident Detection

Participants who complete Feature 5 may implement a related-incident detection capability.

## Goal

Detect incidents that may be connected based on common information.

## Matching criteria

Incidents may be considered related when they share one or more of the following:

- Same impacted service
- Similar title keywords
- Similar incident descriptions
- Same error code or failure category
- Creation time within a defined period

## Requirements

- Compare a selected incident with existing incidents
- Display possible related incidents
- Show the reason for each suggested match
- Allow the user to link related incidents
- Prevent an incident from being linked to itself
- Prevent the same incidents from being linked more than once

### Example

```text
Possible Related Incident: INC-1042

Reason:
- Both incidents affect the Payment Service
- Both contain the keyword "timeout"
- The incidents were created within 30 minutes of each other
```

### Definition of Done

The application identifies at least one possible related incident using understandable matching rules and explains why the incidents may be related.

---

# 6. Minimum Deliverables

Participants should demonstrate:

1. A runnable application
2. Incident creation and incident listing
3. Incident detail view
4. Incident status and ownership updates
5. At least one invalid status transition being rejected
6. Dashboard metrics
7. At least two filters or smart views
8. RCA generation for a selected incident
9. SLA calculation for at least one active incident
10. Evidence of using GitHub Copilot during development

---

# 7. GitHub Copilot Usage Expectations

Participants should use GitHub Copilot for activities such as:

- Planning the application structure
- Generating frontend components
- Generating backend endpoints
- Creating incident and RCA models
- Implementing validation logic
- Implementing status transitions
- Building dashboard aggregations
- Creating charts and visual components
- Generating the RCA template
- Implementing SLA calculations
- Handling date and time calculations
- Detecting related incidents
- Explaining unfamiliar code
- Debugging application errors
- Refactoring repeated logic
- Generating tests and documentation

Participants should use multiple focused prompts instead of requesting the complete application through one large prompt.

---

# 8. Evaluation Criteria

| Evaluation Area | Points |
|---|---:|
| Feature 0 – Runnable application | 5 |
| Feature 1 – Incident management | 15 |
| Feature 2 – Lifecycle and ownership | 15 |
| Feature 3 – Dashboard and smart views | 20 |
| Feature 4 – RCA generator | 20 |
| Feature 5 – SLA monitoring and escalation | 15 |
| Effective GitHub Copilot usage | 10 |
| **Total** | **100** |

> The Related Incident Detection extension may be used as a tie-breaker when participants receive the same final score.

---

# 9. Demonstration Checklist

During the final demonstration, participants should show:

- Creation of a new incident
- Incident listing and incident detail view
- Incident owner assignment
- One valid status transition
- One invalid status transition
- Dashboard metrics and filters
- RCA generation
- SLA status calculation
- An approaching or breached SLA scenario
- Related incident detection, if implemented
- How GitHub Copilot was used to build, test, or improve the application

---

# 10. Important Instructions

- Use only GitHub Copilot as the AI coding assistant
- Build and test the application feature by feature
- Do not attempt to generate the complete application in one prompt
- Review all Copilot-generated code before accepting it
- Test generated code before moving to the next feature
- Prioritize working functionality over excessive UI complexity
- Do not include confidential, client, or production data
