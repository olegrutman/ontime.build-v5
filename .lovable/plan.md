

# Implement "Remodel / Time & Material (T&M)" Project Type

## Overview
Add a `contract_mode` column to the `projects` table (`'fixed'` default, `'tm'`). When a user picks T&M during creation, the wizard skips contracts/building-type/scope steps. In a T&M project, "Change Orders" are relabelled "Work Orders", contract value is the live sum of approved COs, and fixed-contract-only UI is hidden.

---

## Database Migration

```sql
ALTER TABLE public.projects
  ADD COLUMN contract_mode text NOT NULL DEFAULT 'fixed';
```

No new tables, no RLS changes needed — existing project RLS covers the new column.

---

## Files to Modify

### 1. `src/pages/CreateProjectNew.tsx`
- Add `contractMode` state (`'fixed' | 'tm'`), defaulting to `'fixed'`.
- After Basics step (step 0), show a **Contract Mode selector** (two cards: "Fixed Contract" vs "Remodel / T&M").
- Compute `ACTIVE_STEPS` dynamically: if T&M, steps = `[basics, mode, team/review]` (skip contracts, building type, scope). If fixed, steps = current 5-step flow with mode selector inserted after basics.
- On project insert, include `contract_mode: contractMode`.
- Skip `wizard.saveAll()` for T&M projects (no contracts/SOV to save).

### 2. `src/pages/ProjectHome.tsx`
- Add `contract_mode` to the `Project` interface and fetch.
- Pass `isTM = project.contract_mode === 'tm'` down to overview components and sidebar/bottom nav.
- In dark header stat row: if T&M, show type as **"Remodel / T&M"**.
- Hide the "Define Scope" setup banner for T&M projects.

### 3. `src/components/project/ProjectSidebar.tsx`
- Accept `isTM` prop.
- If T&M: relabel "Change Orders" → "Work Orders" in `NAV_GROUPS`.
- Hide "Schedule of Values" nav item for T&M (no baseline SOV).

### 4. `src/components/project/ProjectBottomNav.tsx`
- Accept `isTM` prop.
- Relabel "COs" → "WOs" in `PRIMARY_ITEMS` when T&M.

### 5. `src/components/project/GCProjectOverviewContent.tsx`
- Accept `isTM` prop.
- If T&M: KPI label "Contract Value" → **"T&M Total"**, value = sum of approved COs.
- Hide budget variance / baseline references.

### 6. `src/components/project/TCProjectOverview.tsx`
- Same T&M label swap for contract value KPIs.
- Hide "Contract Value (set by GC)" info boxes; show "T&M Total" instead.

### 7. `src/components/project/FCProjectOverview.tsx`
- Same T&M label swap.

### 8. `src/components/project/ProjectFinancialCommand.tsx`
- If T&M: label "Contract Value" → "T&M Total".

### 9. `src/components/project/COImpactCard.tsx`
- If T&M: label "CO Impact" → "Work Order Total" or similar.

### 10. `src/components/change-orders/COListPage.tsx` (or wherever the CO list header lives)
- If T&M: page title "Change Orders" → "Work Orders", and column headers updated.

### 11. Dashboard project lists
- **`src/components/dashboard/ProjectRow.tsx`** — show a small `T&M` badge next to project name when `contract_mode === 'tm'`.
- **`src/components/dashboard/ProjectSnapshotList.tsx`** — same badge.
- **`src/components/dashboard/DashboardProjectList.tsx`** — same badge.

### 12. New component: `src/components/project-wizard-new/ContractModeSelector.tsx`
- Two selection cards: "Fixed Contract" (existing flow) and "Remodel / T&M" (simplified flow).
- Amber/highlight styling consistent with existing `BuildingTypeSelector`.

---

## Technical Details

- **Contract value calculation for T&M**: reuse `useProjectFinancials` hook — it already sums approved CO totals. For T&M projects, `contractValue = coApprovedTotal` (no base contract).
- **Work Orders = Change Orders**: no new DB table. COs on T&M projects are simply labelled "Work Orders" in the UI. The `change_orders` table and all existing CO logic (creation wizard, approval, invoicing) work unchanged.
- **SOV tab**: hidden for T&M in sidebar since there's no baseline SOV.
- **Setup/scope flow**: hidden for T&M since there's no scope to define upfront.

---

## What stays the same
- POs, Invoices, Crew Tasks, Suppliers, Returns, RFIs, Daily Log, Schedule — all unchanged.
- CO creation wizard, approval flow, pricing models — all unchanged (just relabelled).
- Auth, roles, permissions — unchanged.

