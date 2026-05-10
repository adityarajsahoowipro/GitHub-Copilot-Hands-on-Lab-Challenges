# 🚚 Challenge 2: Fleet Delivery Tracker

![Delivery Truck Logistics](https://images.unsplash.com/photo-1681514583222-0579e6835666?auto=format&fit=crop&w=1200&q=60)

## 🎯 Goal
Build a system to track delivery vehicles and their shipment status.

Each delivery goes through:
- CREATED
- OUT_FOR_DELIVERY
- DELIVERED

---

## 📌 Delivery Model
- deliveryId
- vehicleId
- location
- status (CREATED | OUT_FOR_DELIVERY | DELIVERED)
- deliveryDate

---

## 🪜 Feature Ladder

### ✅ Feature 0 — Setup
- Project setup
- Create in-memory storage

---

### ✅ Feature 1 — Create & View Deliveries
- Add delivery
- List all deliveries

---

### ✅ Feature 2 — Update Delivery Status
- Move status:
  - CREATED → OUT_FOR_DELIVERY → DELIVERED
- Validate transitions

---

### ✅ Feature 3 — Smart Tracking
- Get:
  - active deliveries (OUT_FOR_DELIVERY)
  - deliveries by location

---

### ✅ Feature 4 — Robustness
- Prevent invalid updates
- Handle missing delivery IDs
- Validate fields

---

### ✅ Feature 5 — Bonus
- Show summary:
  - total deliveries
  - delivered vs pending
- Sort deliveries by date

---

## ✅ Deliverables
- Working system
- Demo:
  - create → update → track active deliveries
- Show Copilot usage
