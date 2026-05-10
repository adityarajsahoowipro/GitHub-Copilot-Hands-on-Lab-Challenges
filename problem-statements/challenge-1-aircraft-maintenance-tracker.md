# ✈️ Challenge 1: Aircraft Maintenance Tracker

![Aircraft Maintenance](https://images.stockcake.com/public/a/9/f/a9ffe682-d7cc-4b05-bf61-b19f61e8a30c_large/airplane-maintenance-hangar-stockcake.jpg)

## 🎯 Goal
Build a system to track the maintenance status of aircrafts in real-time.

Each aircraft goes through maintenance stages:
- SCHEDULED
- IN_PROGRESS
- COMPLETED

---

## 📌 Aircraft Model
- aircraftId
- name
- status (SCHEDULED | IN_PROGRESS | COMPLETED)
- maintenanceDate
- engineerName

---

## 🪜 Feature Ladder

### ✅ Feature 0 — Start Your App

Make sure your project is running.

- Add a simple `/health` endpoint returning "OK"

✅ Done when:
- App runs successfully
- `/health` works

---

### ✅ Feature 1 — Aircraft Registration
- Create an in-memory list to store aircrafts
- Add new aircraft
- List all aircraft
- Default status = SCHEDULED

---

### ✅ Feature 2 — Update Maintenance Status
- Update status:
  - SCHEDULED → IN_PROGRESS → COMPLETED
- Prevent invalid transitions (e.g., COMPLETED → IN_PROGRESS)

---

### ✅ Feature 3 — Smart Tracking
- Get all aircrafts:
  - currently in maintenance (IN_PROGRESS)
  - scheduled for today
- Add endpoint: `/aircrafts/active`

---

### ✅ Feature 4 — Robustness
- Validate:
  - aircraftId uniqueness
  - valid status transitions
- Show clear error messages

---

### ✅ Feature 5 — Bonus (Real-Time Thinking)
- Simulate "real-time updates":
  - log status changes with timestamps
  OR
  - maintain history of status changes

---

## ✅ Deliverables
- Working system
- Demo:
  - add aircraft → update status → show active tracking
- Explain how Copilot was used
