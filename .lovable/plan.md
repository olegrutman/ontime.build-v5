

# Framing Scope Wizard — QA Audit Results

## Summary

After reading all 11 section files, types, hook, and wizard shell, here are the findings organized by checklist block. Most questions pass. Several items are **missing or incomplete**.

---

## BLOCK 1 — Material Responsibility Gate: PASS (Q1-5)
- Q1: Material Responsibility is first, before framing method. Three correct options with descriptions. **PASS**
- Q2: Sheathing section switches to "Do you install GC-supplied wall sheathing?" Yes/No when LABOR_ONLY. **PASS**
- Q3: Furnish & Install shows sheathing type, WRB brand, fascia material, soffit material, lumber grade. **PASS**
- Q4: `MaterialBanner` renders on every section except section 0 with Edit link. **PASS**
- Q5: Switching matResp re-renders all sections reactively. **PASS**

## BLOCK 2 — Building Type Logic: PASS (Q6-10), ISSUE on Q11
- Q6-10: All visibility helpers (`showElevator`, `showCorridors`, `showDemising`, etc.) correctly gate by building type. Commercial shows commercial blocking, hides residential. **PASS**
- Q11: Building type is passed as a prop from `ProjectHome.tsx`, derived from project data — not asked again. **PASS**

## BLOCK 3 — Section 2 Building Features: PASS (Q12-16)
- Q12: Stairs child panel has all 5 items. **PASS**
- Q13: Elevator child panel has all 4 items. **PASS**
- Q14: Tuck-under garage child panel has all 4 items. **PASS**
- Q15: Balcony child panel has type radio (Cantilever/Ledger/Both) + scope checkboxes. Only shows when yes. **PASS**
- Q16: Corridors and breezeways are separate YesNoRow questions. **PASS**

## BLOCK 4 — Section 3 Sheathing & WRB: PASS (Q17-21)
- Q17: All 6 sheathing options present. **PASS**
- Q18: WRB hides when ZIP_SYSTEM selected. **PASS**
- Q19: All WRB options present including "WRB by others". **PASS**
- Q20: Tape seams sub-question appears when WRB type is set and not BY_OTHERS. **PASS**
- Q21: Roof sheathing and underlayment are separate. Underlayment type shows with all 4 options when F&I + yes. **PASS**

## BLOCK 5 — Section 4 Fascia/Soffit: MOSTLY PASS, ISSUES on Q25 and Q27
- Q22: Fascia/soffit is its own section (Section 4), separate from siding (Section 5). **PASS**
- Q23: Rough fascia and finished fascia are separate questions. Rough has all 4 checkbox items. **PASS**
- Q24: Finished fascia material has all 6 options. **PASS**
- Q25: **MISSING** — There is no separate "soffit nailer framing" question. The section only asks about finished soffit panels and vented soffit. The spec requires asking about rough soffit nailer framing separately from finished panels.
- Q26: Finished soffit material has all 7 options. **PASS**
- Q27: Vented soffit is a separate Yes/No question. **PASS** — but it's nested inside the finished_soffit ChildPanel (only visible when finished_soffit = yes). Per spec it should be independent — you can have vented soffit requirement even if you're not installing finished panels. **ISSUE**
- Q28: Frieze boards are a separate question from fascia. **PASS**

## BLOCK 6 — Section 5 Siding: MOSTLY PASS, ISSUES on Q32, Q38
- Q29: Siding section contains only siding items. No sheathing/WRB/fascia/structural. **PASS**
- Q30: Siding type is a multi-select checkbox with all 14 types. **PASS**
- Q31: Elevation assignment for multi shows 4 radio options; SFR/TH shows checkbox list. **PASS**
- Q32: **MISSING** — Per-elevation siding type assignment table is not implemented. The `elevation_siding_map` field exists in types but the UI doesn't render a table to assign siding types per elevation when multiple types are selected.
- Q33: Window trim is a separate question in siding section with all 4 material options. **PASS**
- Q34: Head flashing and sill pan are sub-questions under window trim. **PASS**
- Q35: Corner treatment is separate with all 5 options. **PASS**
- Q36: Belly band/water table is a separate question. **PASS**
- Q37: Siding accessories show for non-LABOR_ONLY with all 5 checkbox items. **PASS**
- Q38: **MISSING** — No auto-generated installation note about manufacturer instructions and fastener patterns. The spec requires a static note at the end of the siding section.

## BLOCK 7 — Section 6 Openings: PASS (Q39-44)
- Q39: Windows, ext doors, patio doors, overhead doors are 4 separate questions. **PASS**
- Q40: GFCI/CFCI/RO_ONLY/NOT_IN_SCOPE radio. CFCI only appears when not LABOR_ONLY. **PASS**
- Q41: Window child panel has all 3 sub-questions (pan flashing, head flashing, foam seal). **PASS**
- Q42: Door hardware is a separate sub-question, appears when door mode is GFCI/CFCI. **PASS**
- Q43: Overhead doors only show when `hasGarages` (tuck_under = yes + correct building type). **PASS**
- Q44: Elevation variance question exists as the last question. **PASS**

## BLOCK 8 — Section 7 Blocking: PASS (Q45-48)
- Q45: Uses BlockingTable with IN/EX toggle format. **PASS**
- Q46: All 16 residential blocking items present (7 standard + 9 optional). **PASS**
- Q47: Commercial items replace residential for COMMERCIAL type. 6 commercial items present. **PASS** — but missing "ADA restroom fixture backing" label — checking... it IS present as `ada_restroom`. **PASS**
- Q48: Back-out is separate from blocking table with 3 pricing options and explanation subtitle. **PASS**

## BLOCK 9 — Section 8 Fire & Smoke: PASS (Q49-53)
- Q49: Fire blocking has IBC 718 reference in subtitle. **PASS**
- Q50: Draft stops separate from fire blocking with compartment size reference. **PASS** — but only says "3,000 sqft residential", doesn't mention "1,000 sqft hotel". **MINOR ISSUE**
- Q51: Penetration firestopping is separate with 3 options. **PASS**
- Q52: Demising walls only for TH/MULTI/HOTEL (via `showDemising`). Child panel has 3 options. **PASS**
- Q53: Corridor fire-rated walls only for MULTI/HOTEL (via `showCorridorFireWalls`). **PASS**

## BLOCK 10 — Section 9 Hardware: PASS (Q54-56)
- Q54: Structural connectors label changes based on matResp. **PASS**
- Q55: Ledger bolts only visible when balconies = yes. **PASS**
- Q56: Fasteners label changes based on matResp. **PASS**

## BLOCK 11 — Sections 10 & 11: PASS (Q57-60)
- Q57: Hoisting has all 4 options. **PASS**
- Q58: Tarps and lumber storage are separate questions. **PASS**
- Q59: Back-out is in Section 7 (Blocking), not dry-in. **PASS**
- Q60: Cleanup has all 5 items + warranty (6 total). **PASS**

## BLOCK 12 — Scope Document: PARTIALLY PASS
- Q61-65: ScopeDocument exists with title, badges, footer, action buttons. Answers are saved to DB. **PASS** (document generation works)

## BLOCK 13 — UI/Nav/Persistence: PASS (Q66-70)
- All nav, persistence, mobile drawer, resume banner are implemented. **PASS**

## BLOCK 14 — Items That Must NOT Appear: PASS (Q71-75)
- No electrical/plumbing/HVAC scope items found.
- No sheathing/WRB/fire in siding section.
- No dollar amounts or contract sums.
- No team/org/address questions.
- Drywall only referenced as "before drywall" context. **PASS**

---

## Issues to Fix (Implementation Plan)

### 1. Add "Soffit nailer framing" question to ExteriorSection (Q25)
Add a separate YesNoRow before finished soffit: "Soffit nailer framing in scope?" — rough framing for soffit attachment, separate from the finished panel.

### 2. Move "Vented soffit" out of finished_soffit ChildPanel (Q27)
Make it a standalone YesNoRow at the section level so it's visible even when finished_soffit = No.

### 3. Add per-elevation siding assignment table to SidingSection (Q32)
When `siding_types.length > 1`, render a simple table with one row per selected elevation and a dropdown/radio for siding type assignment per face.

### 4. Add auto-generated installation note to SidingSection (Q38)
Static `<p>` at bottom of siding section: "All siding installed per manufacturer's published installation instructions..."

### 5. Update draft stops subtitle in FireSection (Q50)
Add "1,000 sqft (hotel)" to the existing subtitle.

### Files Modified
- `src/components/framing-scope/sections/ExteriorSection.tsx` — add soffit nailer question, move vented soffit
- `src/components/framing-scope/sections/SidingSection.tsx` — add elevation-siding table + installation note
- `src/components/framing-scope/sections/FireSection.tsx` — update draft stops subtitle
- `src/types/framingScope.ts` — add `soffit_nailer: YesNoNa` to `ExteriorAnswers`, update defaults

### Files NOT Changed
- All other sections, hooks, database, routing — untouched

