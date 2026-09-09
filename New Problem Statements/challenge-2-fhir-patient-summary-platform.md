# 🏥 Challenge 2: FHIR Patient Summary and Data Quality Platform

## ⏱️ Hands-on Build Time

1 hour

---

## 1. Problem Statement

Healthcare applications often exchange information using FHIR resources. A single FHIR Bundle may contain different resources such as Patient, Observation, Condition, MedicationRequest, and Encounter.

Understanding these resources manually can be difficult because:

- Different resources use different structures
- Some information is deeply nested
- Resources may reference one another
- Important fields may be missing or invalid
- Raw FHIR JSON is not easy for non-technical users to understand

Build a **FHIR Patient Summary and Data Quality Platform** that reads a sample FHIR Bundle, extracts useful information, resolves relationships between resources, and presents a clear patient summary.

The platform must also identify data-quality issues such as missing fields, invalid references, unsupported resource types, and malformed observations.

The solution must use only sample or synthetic healthcare data. Do not use real patient information or Protected Health Information.

---

## 2. Outcomes Expected

By completing this challenge, participants should demonstrate:

- A runnable and presentable FHIR data application
- Upload or input of a sample FHIR Bundle
- Parsing of multiple FHIR resource types
- A readable patient-summary dashboard
- Extraction and display of clinical observations
- Resolution of references between FHIR resources
- Detection of missing or inconsistent data
- Clear validation and error handling
- Effective use of GitHub Copilot throughout development

---

## 3. Technology Guidelines

Participants may choose a suitable technology stack.

The solution may be implemented as:

- A full-stack web application
- A frontend application that processes a local JSON file
- A backend API with an interactive interface
- A command-line parser with a generated report

### Required development tool

- **GitHub Copilot** for planning, code generation, code completion, explanation, debugging, testing, and refactoring

### Data storage

- In-memory storage is acceptable
- Local JSON files are acceptable
- A database is optional

> Only GitHub Copilot may be used as the AI coding assistant.

> Only sample, mock, or synthetic healthcare data may be used. Real patient data and PHI must not be entered into the application.

---

## 4. Supported FHIR Resources

The application should support at least the following FHIR resource types:

### Patient

Extract fields such as:

- Patient ID
- Name
- Birth date
- Administrative gender
- Contact information
- Address

### Observation

Extract fields such as:

- Observation ID
- Observation name or code
- Status
- Value
- Unit
- Effective date
- Patient reference

### Condition

Extract fields such as:

- Condition ID
- Condition name or code
- Clinical status
- Verification status
- Recorded date
- Patient reference

### MedicationRequest

Extract fields such as:

- Medication request ID
- Medication name or code
- Request status
- Intent
- Authored date
- Patient reference

### Encounter

Extract fields such as:

- Encounter ID
- Encounter status
- Encounter type
- Start and end date
- Patient reference

Participants may support additional FHIR resources if time permits.

---

## 5. Suggested Normalized Data Model

The application may transform FHIR resources into a simpler internal format.

### Patient Summary

- `patientId`
- `fullName`
- `birthDate`
- `administrativeGender`
- `contact`
- `address`

### Observation Summary

- `observationId`
- `patientId`
- `name`
- `status`
- `value`
- `unit`
- `effectiveDate`

### Condition Summary

- `conditionId`
- `patientId`
- `conditionName`
- `clinicalStatus`
- `verificationStatus`
- `recordedDate`

### Medication Summary

- `medicationRequestId`
- `patientId`
- `medicationName`
- `status`
- `intent`
- `authoredDate`

---

# 🪜 Feature Ladder

Participants must build the application incrementally. Complete and test each feature before moving to the next feature.

---

## ✅ Feature 0 — Start the Application

Create and run the initial application.

The application should display either:

- A landing page titled **FHIR Patient Summary Platform**

or

- A health-check endpoint returning a successful response

### Definition of Done

- The application starts without errors
- The landing page or health-check endpoint works
- The initial project structure is available

---

## ✅ Feature 1 — FHIR Bundle Input and Resource Parsing

Allow a user to provide a sample FHIR Bundle in JSON format.

### Input options

Support at least one of the following:

- Upload a `.json` file
- Paste FHIR JSON into a text area
- Load a sample FHIR Bundle included with the application
- Send the FHIR Bundle to an API endpoint

### Requirements

- Parse the JSON input
- Verify that the top-level `resourceType` is `Bundle`
- Read resources from the Bundle entries
- Identify each supported resource type
- Count the number of resources by type
- Display unsupported resource types separately

### Example resource counts

```text
Patient: 1
Observation: 5
Condition: 2
MedicationRequest: 3
Encounter: 1
Unsupported Resources: 2
```

### Required validation

- Reject invalid JSON
- Reject input that is not a FHIR Bundle
- Handle a Bundle with no entries
- Handle entries with a missing resource
- Do not crash when an unsupported resource is found

### Definition of Done

A user can provide a valid sample FHIR Bundle and view the total number of resources grouped by type.

---

## ✅ Feature 2 — Patient Summary and Resource Extraction

Extract key information from the supported FHIR resources.

### Patient summary requirements

Display:

- Patient ID
- Full name
- Birth date
- Administrative gender
- Contact details, if available
- Address, if available

### Clinical summary requirements

Display:

- Observations
- Conditions
- Medication requests
- Encounters

Each item should be associated with the correct patient whenever a patient reference is available.

### Data transformation

Convert complex FHIR fields into readable values.

Examples include:

- Combine given and family names
- Extract display text from coded values
- Display observation value and unit together
- Convert dates into a readable format
- Show `Not available` when an optional field is missing

### Definition of Done

A user can select or view a patient and see a readable summary generated from the available FHIR resources.

---

## ✅ Feature 3 — Patient Dashboard and Smart Views

Create a clear dashboard for the parsed FHIR data.

### Summary cards

Display at least the following:

- Total patients
- Total observations
- Total conditions
- Total medication requests
- Total encounters
- Total validation issues

### Patient dashboard

For the selected patient, display:

- Basic patient information
- Recent observations
- Active conditions
- Medication requests
- Encounter history

### Smart views

Implement at least three of the following:

- Filter observations by status
- Filter observations by date
- Filter resources by resource type
- Search conditions by name
- Search medications by name
- Sort observations by effective date
- Show only active conditions
- Show only active medication requests

### Visual requirements

Use suitable visual elements such as:

- Summary cards
- Resource-type badges
- Tables or cards
- Status indicators
- At least one chart

### Suggested chart options

- Resources by type
- Observations over time
- Conditions by clinical status
- Medication requests by status

### Definition of Done

The dashboard displays accurate information and provides at least three working smart views or filters.

---

## ✅ Feature 4 — Cross-Resource Reference Resolution

FHIR resources commonly refer to other resources using reference values.

Implement functionality that connects related resources.

### Example references

```text
Patient/patient-101
Observation/observation-201
Encounter/encounter-301
```

### Requirements

- Create a resource index using resource type and resource ID
- Resolve patient references from Observation resources
- Resolve patient references from Condition resources
- Resolve patient references from MedicationRequest resources
- Resolve patient references from Encounter resources
- Display connected resources under the correct patient
- Detect references that cannot be resolved

### Example

```text
Observation:
Blood Pressure – 120/80 mmHg

Subject Reference:
Patient/patient-101

Resolved Patient:
Sample Patient
```

### Unresolved-reference handling

When a referenced resource cannot be found:

- Do not crash the application
- Display the unresolved reference
- Add the issue to the data-quality report
- Clearly identify the resource containing the broken reference

### Multiple-patient handling

If the Bundle contains multiple patients:

- Group resources under the correct patient
- Allow the user to switch between patient summaries
- Keep unassigned resources in a separate section

### Definition of Done

The application links supported resources to the correct patient and clearly reports unresolved or invalid references.

---

## ✅ Feature 5 — FHIR Data Quality and Validation Engine

Create a data-quality engine that analyzes the FHIR Bundle and produces a validation report.

### Validation categories

Implement checks for the following categories.

#### Bundle-level checks

- Missing Bundle ID
- Missing or empty entries
- Duplicate resource IDs
- Entries with missing resources
- Invalid or missing resource types

#### Patient checks

- Missing patient ID
- Missing patient name
- Missing birth date
- Incorrectly structured name
- Missing or invalid patient reference

#### Observation checks

- Missing observation status
- Missing observation code or display name
- Missing value
- Missing unit when a numeric value is present
- Missing effective date
- Unsupported value format
- Broken patient reference

#### Condition checks

- Missing condition code or display name
- Missing clinical status
- Missing patient reference
- Broken patient reference

#### Medication checks

- Missing medication name or code
- Missing request status
- Missing intent
- Missing patient reference
- Broken patient reference

### Severity levels

Assign a severity to every validation issue:

- `ERROR`
- `WARNING`
- `INFORMATION`

### Example validation issue

```json
{
  "severity": "ERROR",
  "resourceType": "Observation",
  "resourceId": "observation-201",
  "field": "subject.reference",
  "message": "The referenced patient could not be found in the Bundle."
}
```

### Data-quality score

Calculate a simple data-quality score out of 100.

Suggested approach:

```text
Starting score: 100

ERROR: subtract 10 points
WARNING: subtract 5 points
INFORMATION: subtract 1 point

Minimum score: 0
Maximum score: 100
```

### Validation report

Display:

- Overall data-quality score
- Total errors
- Total warnings
- Total informational findings
- Issues grouped by resource type
- Issues grouped by severity
- Resource ID and field associated with each issue

### Export requirement

Allow the validation report to be exported as at least one of the following:

- JSON
- Markdown
- Plain text

### Edge cases

Handle:

- Duplicate resources
- Missing resource IDs
- Missing nested properties
- Different observation value formats
- Multiple patients
- Unsupported resource types
- Empty arrays
- Null values
- Broken references

### Definition of Done

The application analyzes the Bundle, calculates a data-quality score, displays understandable validation findings, and exports the report.

---

# ⭐ Optional Advanced Extension — FHIR Difference Viewer

Participants who complete Feature 5 may implement a FHIR Difference Viewer.

## Goal

Compare two versions of the same FHIR resource and clearly display what changed.

### Example comparisons

- A patient's address was updated
- An Observation status changed
- A medication request was cancelled
- A Condition clinical status changed
- An Encounter end date was added

### Requirements

- Accept two versions of the same FHIR resource
- Validate that both resources have the same resource type and ID
- Compare nested fields
- Display added, removed, and changed values
- Ignore fields selected by the user, such as metadata timestamps
- Show the comparison in a readable format

### Example output

```text
Resource: MedicationRequest/medication-101

Changed:
- status: active → cancelled
- authoredOn: 2026-08-01 → 2026-08-05

Added:
- statusReason: Treatment discontinued

Removed:
- dosageInstruction[0].patientInstruction
```

### Edge cases

Handle:

- Arrays with different lengths
- Nested objects
- Missing fields
- Null values
- Resources with different IDs
- Resources with different resource types

### Definition of Done

The application compares two FHIR resources and presents understandable added, removed, and changed fields.

---

# 6. Minimum Deliverables

Participants should demonstrate:

1. A runnable application
2. Input of a sample FHIR Bundle
3. Resource parsing and resource-type counts
4. A readable patient summary
5. Observations, conditions, medications, or encounters displayed
6. At least three smart views or filters
7. Cross-resource reference resolution
8. Detection of at least one unresolved reference
9. A data-quality score and validation report
10. Evidence of using GitHub Copilot during development

---

# 7. GitHub Copilot Usage Expectations

Participants should use GitHub Copilot for activities such as:

- Understanding the FHIR Bundle structure
- Planning the application architecture
- Generating resource parsers
- Safely accessing nested JSON properties
- Creating normalized data models
- Building reusable resource-extraction functions
- Resolving references between resources
- Generating dashboard components
- Implementing filters and charts
- Creating validation rules
- Calculating the data-quality score
- Exporting the validation report
- Generating automated tests
- Explaining unfamiliar FHIR fields
- Debugging malformed JSON and missing data
- Refactoring repeated parsing logic
- Generating documentation

Participants should use multiple focused prompts rather than asking GitHub Copilot to generate the complete application in a single prompt.

---

# 8. Evaluation Criteria

| Evaluation Area | Points |
|---|---:|
| Feature 0 – Runnable application | 5 |
| Feature 1 – Bundle parsing | 15 |
| Feature 2 – Patient summary and extraction | 15 |
| Feature 3 – Dashboard and smart views | 15 |
| Feature 4 – Reference resolution | 20 |
| Feature 5 – Data quality and validation | 20 |
| Effective GitHub Copilot usage | 10 |
| **Total** | **100** |

> The FHIR Difference Viewer may be used as a tie-breaker when participants receive the same final score.

---

# 9. Demonstration Checklist

During the final demonstration, participants should show:

- Loading or pasting a sample FHIR Bundle
- Resource counts by type
- Patient details
- At least one Observation
- At least one Condition or MedicationRequest
- At least three filters or smart views
- A successfully resolved patient reference
- An unresolved-reference example
- The data-quality report
- The calculated data-quality score
