# 🗺️ Colony Sim: Development Roadmap

**Current Status:** Phase 3.5 (UI Refactor & Territory Visualization Complete).
**Immediate Goal:** Map Generation 2.0 (Rivers, Mountains, & Geography).

---

## 📋 Master Priority List

### ✅ COMPLETED: Recent Updates
* **UI & CSS Refactor:** Scrubbed inline styles from `gameEngine.js` and `ui.js`; moved styling to `style.css` for cleaner code and easier theming.
* **Land Survey System:** Added logic to calculate "Potential Yields" for Settlements based on radius.
* **Territory Visualization:**
    * Implemented `drawTerritory` in `renderer.js`.
    * Visualized settlement radius with a smart, animated dashed border.
    * Integrated yield data into a clean "Land Survey" section in the Context Bar.

---

### 🟢 Priority 1: Map Generation 2.0 - "Geography & Depth" (NEXT)
**Concept:** Transform the map from "blobs of forest" into a strategic landscape.
1.  **Rivers & Fresh Water:**
    * Procedural river generation (downhill flow logic).
    * gameplay bonus: "Fresh Water" status for adjacent tiles (Growth/Health boost).
2.  **Mountains & Elevation:**
    * Impassable high-altitude tiles.
    * Strategic choke points and future sources of Ore/Stone.
3.  **Coastlines:**
    * Identify "Beach" tiles between Water and Land for better visual transitions.

---

### 🟡 Priority 2: Tech 2.0 - "Synergy & Innovation"
**Concept:** A realistic cycle of Discovery -> Application -> Visualization.
1.  **Tech Categories (`techCategories.js`):** Implement the master list (Survival, Construction, Agriculture, Husbandry).
2.  **Unlock Logic (`techRegistry.js`):** Update Techs to require specific Category Levels (e.g., `req: { agriculture: 5 }`).
3.  **Dynamic Visual Resolver:**
    * Create logic to map `Town State` (Pop + Tech) -> `Visual Assets`.
    * Refactor `renderer.js` to remove hardcoded "tent_small" logic.
    * Enable `hut_clay` and `campfire` to appear automatically when criteria are met.

---

### 🟠 Priority 3: Organic Trade & Road Network
**Concept:** Infrastructure is passive. Roads appear based on traffic.
1.  **Trade Manager:** Calculate connection strength between towns.
2.  **Tech Osmosis:** Passive research gain via trade routes.
3.  **Visual Roads:** Draw dashed/solid lines based on route strength.

---

## 🐛 Bug List & Debt

### 1. Stack Cycling (UX Polish)
**Description:** Units currently block clicks on Settlements underneath them.
**Fix:** Update `handleExploreEvent` to cycle selection (Unit -> City -> Unit) if clicked repeatedly.