

# Multi-Fix Plan: FC Budget, GC Privacy, Scope UI, Supplier & Overview Pages, CO Wizard

## Plain English Summary

You're asking for 6 things:

1. **FC can't set their internal cost/budget on Overview** — Right now the FC sees "Internal Cost Budget: —" but there's no way to type a number in. The `updateLaborBudget` function exists but the FC overview never wires it up.

2. **GC sees the TC↔FC contract on project info** — The `OverviewContractsSection` blindly shows both upstream and downstream contracts to everyone. GC should only see the GC↔TC contract, never the TC↔FC one.

3. **Scope section on project info needs better design** — The current collapsible card is functional but dense. It needs clearer visual hierarchy, better grouping, and a more scannable layout.

4. **Check supplier overview page** — Verify the `SupplierProjectOverview` links, hooks, and data flow are working correctly.

5. **Check TC, FC, GC overview pages** — Verify hooks, links, and navigation across all three role overviews work end to end.

6. **CO wizard on fixed projects should follow WO wizard principles** — The T&M wizard has work type selection, AI scope descriptions, smart catalog filtering, and visual location picking. The fixed-price CO wizard should use the same polished flow.

---

## Technical Changes

### 1. FC Internal Budget — Editable KPI Card
**File: `src/components/project/FCProjectOverview.tsx`**

- Add `useState` for `draftBudget` initialized from `financials.laborBudget`
- Add an `EditField`-style inline edit on the "Internal Cost Budget" row inside Card 1
- Wire the save to `financials.updateLaborBudget(fcContract.id, amount)` 
- On save, call `financials.refetch()` to update margin calculations
- Also make Card 2 (Net Margin) sub-text say "Enter budget below" with a link instead of just showing dashes

### 2. Hide TC↔FC Contract from GC
**File: `src/components/project/OverviewContractsSection.tsx`**

- Add role check: if `viewerRole === 'General Contractor'`, skip `downstreamContract`
- Only TC and FC should see the downstream contract
- Simple 3-line conditional change

### 3. Scope Section Redesign  
**File: `src/components/project/ProjectScopeSection.tsx`**

- Replace the dense collapsible card with a cleaner layout:
  - Top: summary chips (home type, floors, foundation) always visible
  - Inclusion badges promoted to top level with colored dots (green = included, gray = not)
  - Expandable detail sections use a 2-column grid with icons and clear headers
  - Scope description shown as a highlighted callout block when present
  - Fewer nesting levels, larger touch targets
  - "Edit" button stays in header

### 4. Supplier Overview Page Audit
**File: `src/components/project/SupplierProjectOverview.tsx`**

- Verify all `onNavigate()` calls use valid tab names
- Check that PO queries, estimate queries, and material data flows work
- Fix any broken links or missing data connections
- Verify the KPI cards reference the correct financial fields

### 5. TC / FC / GC Overview Audit
**Files: `TCProjectOverview.tsx`, `FCProjectOverview.tsx`, `GCProjectOverviewContent.tsx`**

- Verify all `onNavigate()` calls map to real tab routes
- Check that CO queries don't leak cross-org data
- Verify change order click-through navigates correctly
- Ensure invoice links, RFI links, and PO links all resolve

### 6. CO Wizard for Fixed Projects — Follow WO Wizard Principles
**File: `src/components/change-orders/wizard/COWizard.tsx`**

- **Step 1 (Why)**: Keep reason cards but add a sub-step for "structural element" selection (like WO wizard's work type step) — e.g., after selecting "Addition", user picks what kind (Framing, Electrical, Plumbing, Finish)
- **Step 2 (Where)**: Already uses `VisualLocationPicker` — verify it reads `project_scope_details` for smart options (like the WO wizard does)
- **Step 3 (Scope)**: Add auto-navigation to relevant catalog division based on Step 1 selection (matching WO wizard behavior where "framing" auto-opens framing division)
- **Step 5 (Review)**: Add AI-generated scope description (call `generate-work-order-description` edge function) as the WO wizard does — show it in a preview card with edit capability
- Keep the CO-specific "Pricing & Configuration" step (Step 4) as-is since fixed-price COs need the pricing type selector

## Files Changed
- `src/components/project/FCProjectOverview.tsx` — add editable budget field (~30 lines)
- `src/components/project/OverviewContractsSection.tsx` — add role gate (~3 lines)
- `src/components/project/ProjectScopeSection.tsx` — redesign layout (~80 lines)
- `src/components/project/SupplierProjectOverview.tsx` — audit and fix links
- `src/components/project/TCProjectOverview.tsx` — audit links
- `src/components/project/GCProjectOverviewContent.tsx` — audit links
- `src/components/change-orders/wizard/COWizard.tsx` — add work-type substep, AI description, smart catalog nav (~60 lines)

## What stays the same
- Database schema — no migrations needed
- All existing hooks — `useProjectFinancials`, `updateLaborBudget` already work
- TMWOWizard — untouched
- RLS policies — no changes

