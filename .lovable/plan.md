## Goal

Make the in-app demo more powerful in two ways:
1. Let the viewer flip between GC / TC / FC / Supplier instantly without leaving the project.
2. Add tour steps that walk through the newly rebuilt CO/WO financial card (revenue, cost, margin, pending exposure) per role.

---

## Part 1 — In-demo role switcher

**Where:** `src/components/demo/DemoBanner.tsx` (sticky banner, already shown in every demo route).

**What changes:**
- Replace the static "Viewing as {role}" text with a compact pill-style segmented control: `GC | TC | FC | Supplier`.
- The active role highlights; clicking another role calls a new `switchRole(role)` action.
- Keep `Reset` and `Exit Demo` buttons unchanged.

**New context action in `src/contexts/DemoContext.tsx`:**
- Add `switchRole(role: DemoRole)` that only updates `demoRole` (no store reset, no nav change) so the same demo project stays open and any in-progress work survives.
- Expose it through `DemoContextValue`.

**Bolt tour interaction (`src/hooks/useBoltGuide.ts`, `src/data/boltScripts.ts`):**
- When role changes mid-tour, auto-load the new role's script from step 0 and surface a toast: "Tour switched to {role}".
- The script lookup is already keyed by role in `BOLT_SCRIPTS[role]`, so only the trigger needs wiring.

**Routing:** No route changes. The existing demo project id stays in `demoProjectId`; each page already reads `demoRole` from context to pick the right dashboard view.

---

## Part 2 — Extend Bolt tour to cover the CO KPI card

**Where:** `src/data/boltScripts.ts` — append one step to GC, TC, and FC scripts (Supplier gets none — suppliers don't see CO financials).

**Target element:** add `data-demo-target="co-impact-card"` to `src/components/project/COImpactCard.tsx` root.

**Steps to add (1 per role, slotted before the closing "celebrate" step):**

- **GC** — "Approved COs add scope and dollars to the contract. Here you see CO revenue, your true cost (no TC markup hidden from you per privacy rules), the resulting margin, and pending exposure from COs still in flight."
  - `targetTab: 'overview'`, `targetSelector: '[data-demo-target="co-impact-card"]'`, pose `point`.

- **TC** — "Your CO scorecard: revenue is what you billed the GC via `tc_submitted_price`, cost is your labor + materials + equipment, margin is the spread. Pending exposure = COs you've submitted but not yet approved."
  - same target, pose `thinking`.

- **FC** — "COs you've worked on roll up here. Revenue is what your TC pays you, cost is your labor + materials. Pending exposure shows COs awaiting TC approval."
  - same target, pose `point`.

**Step count update:** Bolt step counters (e.g. "3 of 6") will auto-bump to 7 — no hardcoded totals to fix (verified via `useBoltGuide.ts` length-based logic).

---

## Out of scope

- No write-enabled "create your first CO" sandbox (separate, larger effort).
- No backend / RLS changes — purely UI + demo context.
- No changes to the actual CO math (already shipped & unit-tested).

---

## Technical details

- `DemoContext.switchRole` is a pure state update: `setState(prev => ({ ...prev, demoRole: role }))`. Does not touch `store`, so demo mutations persist across role flips.
- Segmented control in `DemoBanner` uses existing `Button` ghost variants with `aria-pressed` for the active role to avoid pulling in a new shadcn component.
- `COImpactCard` already hides when revenue+pending are both zero; tour step will still spotlight the empty-state card so the explanation lands even on a quiet demo project. Alternative: seed one approved CO in `DEMO_WORK_ORDERS` so the card is non-empty for GC/TC/FC roles. Recommended — add 1 approved CO and 1 submitted CO to `src/data/demoData.ts`.
- Files touched:
  - `src/contexts/DemoContext.tsx` (+ `switchRole`)
  - `src/components/demo/DemoBanner.tsx` (segmented control)
  - `src/hooks/useBoltGuide.ts` (reset to step 0 on role change)
  - `src/data/boltScripts.ts` (+3 CO steps)
  - `src/components/project/COImpactCard.tsx` (+ `data-demo-target`)
  - `src/data/demoData.ts` (seed 2 demo COs so card is populated)
