# 🏥 Challenge 3: Patient Flow Tracker

![Hospital Patient Flow](https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=60)

## 🎯 Goal
Build a system to track patient journey inside a hospital.

Each patient moves through:
- REGISTERED
- IN_CONSULTATION
- DISCHARGED

---

## 📌 Patient Model
- patientId
- name
- doctorAssigned
- status (REGISTERED | IN_CONSULTATION | DISCHARGED)
- visitDate

---

## 🪜 Feature Ladder

### ✅ Feature 0 — Setup
- Project setup
- In-memory patient list

---

### ✅ Feature 1 — Register Patient
- Add patient
- View all patients

---

### ✅ Feature 2 — Update Patient Status
- Move through:
  - REGISTERED → IN_CONSULTATION → DISCHARGED
- Prevent invalid transitions

---

### ✅ Feature 3 — Smart Views
- Get:
  - patients currently in consultation
  - patients registered today

---

### ✅ Feature 4 — Robustness
- Validate:
  - patientId uniqueness
  - required fields
- Return proper error handling

---

### ✅ Feature 5 — Bonus
- Generate summary:
  - total patients today
  - discharged count
- Sort by visit time

---

## ✅ Deliverables
- Working system
- Demo:
  - register → update → track active patients
- Show Copilot usage
