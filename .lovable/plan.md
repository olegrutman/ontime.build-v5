

# Use StepCatalog Component for Wizard Scope Step

## Problem

The wizard's "Scope" step uses a basic search-only grid (`StepScope`), while the "Add scope items" dialog on the CO detail page uses the full `StepCatalog` component with division drill-down, category cards, and a polished browsing experience. They should be the same.

## Changes

### File: `src/components/change-orders/wizard/COWizard.tsx`

1. **Replace `<StepScope>` with `<StepCatalog>`** in the step rendering — change line 334 from:
   ```tsx
   {currentStep.key === 'scope' && <StepScope data={data} onChange={update} />}
   ```
   to:
   ```tsx
   {currentStep.key === 'scope' && <StepCatalog data={data} onChange={update} projectId={projectId} />}
   ```

2. **Import `StepCatalog`** — it's already imported in the file (used elsewhere). Verify and add if missing.

3. **Delete the `StepScope` function** (lines ~458-522) — no longer needed.

4. **Handle phase skip** — `StepCatalog` has an internal 3-phase flow (location → reason → items). Since the wizard already has separate "Why" and "Where" steps that set `data.reason` and `data.locationTag`, `StepCatalog` will auto-detect these are set and skip straight to the "items" phase (line 37-39 of StepCatalog already does this).

### What is NOT changing
- `StepCatalog.tsx` itself — no modifications needed
- Other wizard steps, database, RLS
- The `AddScopeItemButton` dialog continues to use `StepCatalog` as before

