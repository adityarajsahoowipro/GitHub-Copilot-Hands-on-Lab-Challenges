# 💬 Bootcamp Demo: Customer Support Ticket Tracker (Feature Ladder)

## ⏱️ Demo Time
~25–30 minutes (10:30 AM – 11:00 AM)

## 🎯 Goal
Build a simple customer support ticket system.

Each ticket moves through:
- OPEN → IN_PROGRESS → RESOLVED

---

## ✅ Purpose of Demo
This demo shows how to:
- Build incrementally using Feature Ladder
- Use GitHub Copilot with small prompts
- Implement real-world logic step by step

---

## 📌 Ticket Model
- id
- title (required)
- description
- status (OPEN | IN_PROGRESS | RESOLVED)
- createdAt

---

## 🪜 Feature Ladder (Demo Scope)

### ✅ Feature 0 — Start Your App (2–3 mins)
Make sure your project is running.

- Add `/health` endpoint returning "OK"

✅ Done when:
- App runs successfully
- `/health` works

---

### ✅ Feature 1 — Create & List Tickets
- Create in-memory list
- Add new ticket (default status = OPEN)
- List all tickets

---

### ✅ Feature 2 — Update Ticket Status
- Update ticket status
- Allow only valid transitions:
  - OPEN → IN_PROGRESS → RESOLVED
- Show error for invalid transitions

---

### ✅ Feature 3 — Filter Tickets
- Get tickets by status:
  - OPEN
  - IN_PROGRESS
  - RESOLVED

Example:
- `/tickets?status=OPEN`

---

## ✅ Deliverables (Demo Output)
- Working APIs
- Show status update flow
- Show filter working
- Demonstrate at least one Copilot prompt

---

## 🤖 Suggested Copilot Prompts (for demo)
- "Create a minimal server with a /health endpoint"
- "Add POST API to create tickets with default status OPEN"
- "Add PATCH API to update status with validation"
- "Add GET API to filter tickets by status"

---

## 🎤 Key Learning for Participants
- Build step-by-step (Feature Ladder)
- Use small prompts instead of one big prompt
- Validate & refine code with Copilot
