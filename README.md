# SentinelDrive: AI-Orchestrated Emergency Response System

### 🏆 Challenge Vertical: Infrastructure & Smart City Safety (NHAI)
SentinelDrive is a dynamic crisis management ecosystem designed to eliminate communication delays during road emergencies. Built using **Google Antigravity**, the system automates the handshake between citizens and emergency services.

---

## 🧠 Core System Logic (The 3-Scene Architecture)
The project demonstrates a seamless transition between three distinct agent roles:

1. **The Commuter (Driver View):** - Real-time GPS tracking on a high-fidelity Chennai map.
   - Intelligent 'Hazard Reporting' trigger that detects incidents and offers a one-tap 'Take Diversion' or 'Report' option.
2. **The Dispatcher (Control Room):** - Automated incident logging in the 'Dispatch Terminal'.
   - Geocoding logic translates GPS coordinates into actionable addresses (e.g., CMWSSB Division 63).
   - 'Confirm Receipt' button triggers the mobilization of rescue units.
3. **The Responder (Ambulance View):**
   - High-speed routing (Green Path) overlay.
   - Dynamic ETA calculation (e.g., "Help is on the way. Estimated arrival: 5 mins").
   - 'Accept & Respond' logic with 'Arrived' status confirmation.

---

## 🛠️ Technical Implementation & Google Services
- **Framework:** React + Tailwind CSS (Optimized for 1MB repo limit).
- **Mapping Logic:** Google Maps SDK logic with custom-styled Leaflet tiles for high-performance, low-latency demo rendering.
- **Agentic Workflow:** Developed within Google Antigravity, using modular prompts to manage complex state transitions and synchronized UI updates across panels.

---

## 📦 Submission Compliance
- **Repo Size:** < 1 MB (Excludes node_modules).
- **Branching:** Single 'main' branch workflow.
- **Visibility:** Public Repository.

---
**Developed for PromptWars | Built with Google Antigravity**
