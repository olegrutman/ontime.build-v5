## Problem

Suppliers currently see GC/TC-only constructs during project setup:
- **Contract Mode** (Fixed vs T&M) — a GC↔TC contract concept
- **Scope step** with SOV gates, weighted percentages, mobilization line item, and a live SOV preview pane
- Scope questions written for cost-allocation (e.g. "Mobilization as separate SOV line item?", "Structural steel in scope? — SCOPE GATE")

In the real world, a supplier (lumber yard, drywall supply, framing materials, etc.) has **no visibility** into the GC↔TC contract. They only care about the **physical project**: where it is, what's being built, and how big it is — so they can scope materials and later issue an estimate. That estimate becomes the de-facto contract (already noted in the prior fix).

## Goal

Give suppliers a clean, structure-centric setup with no financial/contract artifacts.

## New Supplier Flow

```text
Basics  →  Building Type  →  Building Info  →  Review
```

No Contract Mode. No Contracts. No Scope/SOV. No mobilization. No SOV preview pane.

| Step | What it collects |
|---|---|
| Basics | Project name, address, optional team contacts |
| Building Type | Residential / Commercial / Mixed (drives catalog only) |
| Building Info | Stories, foundation, garage, siding, total sqft (reuses the existing `TMBuildingInfoStep`) |
| Review | Project + structure summary only |

## Changes

**`src/pages/CreateProjectNew.tsx`**
- Add `SUPPLIER_STEPS = [basics, building_type, building_info, review]`.
- When `isSupplier`, use `SUPPLIER_STEPS` instead of filtering `FIXED_STEPS` (so `mode`, `contracts`, and `scope` are all removed).
- Force `contractMode` internally to `'fixed'` for suppliers (harmless — never persisted to a contract row since `useSetupWizardV2` already short-circuits for suppliers).
- In `createProject`, for suppliers: skip `wizard.saveAll(...)` and instead write `tmScope` into `project_scope_details` (same insert the T&M path uses). Mark project `status: 'active'` (no setup gating for suppliers since there's no SOV to lock).
- `canProceed` for `building_info` step already exists — reuse it.

**`src/components/project-wizard-new/UnifiedReviewStep.tsx`**
- For suppliers, render a structure-focused summary: Project basics + Building type + Building info (stories, foundation, sqft, garage, siding). Hide the scope/SOV/contract explainer card and the "answered questions" recap that comes from the SOV question set.

**`src/hooks/useSetupWizardV2.ts`**
- No further changes needed — supplier short-circuit for contract/SOV save was added previously. Scope questions are simply never rendered now.

**`src/components/project-wizard-new/BasicsStep.tsx`** (light touch)
- If supplier, the team-invite copy should read "Add teammates who can place orders" rather than crew/subcontractor language. (Verify current copy first; only adjust if it's GC/TC-flavored.)

## Out of scope

- The estimate-acceptance → contract-row creation loop (already noted as a future follow-up).
- Any DB schema or RLS change.
