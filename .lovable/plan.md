

# Overhaul Project Readiness Engine: Role-Based Setup and Auto-Activation

## Overview

This is a significant refactoring of the project readiness system to enforce role-based setup responsibilities depending on WHO created the project (GC or TC), add automatic project activation when all conditions are met, and block Work Orders, Purchase Orders, and Invoices until the project is ACTIVE.

## Current State

- The `projects` table has a `created_by_org_id` column that identifies which organization created the project
- The `projects` table has a `status` field constrained to: `setup`, `active`, `draft`, `on_hold`, `completed`, `archived`
- The readiness hook (`useProjectReadiness`) has a generic 9-item checklist that doesn't vary by creator role
- There is no blocking of WOs/POs/Invoices based on project status
- Contract activation is manual via a button
- There is no supplier estimate tracking in readiness

## What Changes

### 1. Readiness Hook Rewrite (`src/hooks/useProjectReadiness.ts`)

The hook will accept the current user's org type and the project's `created_by_org_id` to build a **context-aware checklist**.

New data queries added:
- Fetch `created_by_org_id` from `projects` table and join to `organizations` to get creator org type
- Fetch `supplier_estimates` for the project to check estimate upload status

**TC-Created Project Checklist:**
1. Contract sum with GC entered
2. Contract sum with FC entered
3. SOV for GC contract created
4. SOV for FC contract created
5. Material responsibility selected
6. Supplier assigned (if TC responsible for materials)
7. GC accepted
8. FC accepted
9. Supplier accepted (if assigned)
10. Supplier estimate uploaded or confirmed none (if supplier assigned)

**GC-Created Project Checklist:**
1. Contract sum with TC entered
2. TC accepted
3. SOV created
4. Material responsibility selected
5. Supplier assigned (if materials required)
6. Supplier accepted (if assigned)
7. Supplier estimate uploaded or confirmed none (if supplier assigned)
8. FC accepted (only if FC was invited)

The hook will also:
- Export a new `creatorOrgType` field (GC or TC)
- Remove the generic "Organization exists", "Retainage defined", and "Contract mode selected" items
- Remove the `firstContractId` / manual activation logic

### 2. Auto-Activation Logic (`src/hooks/useProjectReadiness.ts`)

When `percent === 100` and project status is `setup`:
- Automatically update `projects.status` to `active`
- Show a toast notification: "Project is now active!"
- No manual activation button needed

### 3. Updated Readiness Card (`src/components/project/ProjectReadinessCard.tsx`)

- Remove "Activate Contract" button (activation is now automatic)
- Keep material responsibility inline buttons
- Update title to show creator context (e.g., "TC Setup" or "GC Setup")
- When 100% is reached and auto-activation fires, show a success state briefly

### 4. Block WOs/POs/Invoices When Not Active (`src/pages/ProjectHome.tsx`)

Pass `project.status` to each tab component. When `project.status !== 'active'`:
- Show an alert banner: "Project setup incomplete. Waiting for required parties."
- Hide the "Create" / "+" buttons in WorkOrdersTab, PurchaseOrdersTab, and InvoicesTab
- Display empty state with the blocking message

Implementation approach:
- Add a `projectStatus` prop to `WorkOrdersTab`, `PurchaseOrdersTab`, and `InvoicesTab`
- Each component checks if `projectStatus !== 'active'` and renders a blocking banner instead of action buttons

### 5. Supplier Estimate Tracking

Query `supplier_estimates` table for the project to determine if:
- A supplier has uploaded at least one estimate (any status), OR
- A supplier has confirmed "No Estimate Exists" (we may need a flag for this)

If the `supplier_estimates` table doesn't have a "no estimate" flag, we will add a `no_estimate_confirmed` boolean column to `project_participants` via migration to track when a supplier explicitly confirms no estimate exists.

## Technical Details

### Database Migration

Add `no_estimate_confirmed` column to `project_participants`:
```sql
ALTER TABLE public.project_participants
ADD COLUMN no_estimate_confirmed boolean DEFAULT false;
```

### Files Modified

1. **`src/hooks/useProjectReadiness.ts`** -- Complete rewrite of checklist logic based on creator org type; add auto-activation; add supplier estimate checks
2. **`src/components/project/ProjectReadinessCard.tsx`** -- Remove activate contract button; update display for new checklist items; remove `firstContractId` usage
3. **`src/pages/ProjectHome.tsx`** -- Pass `projectStatus` to tab components; fetch `created_by_org_id` in project query
4. **`src/components/project/WorkOrdersTab.tsx`** -- Add `projectStatus` prop; show blocking banner when not active
5. **`src/components/project/PurchaseOrdersTab.tsx`** -- Add `projectStatus` prop; show blocking banner when not active
6. **`src/components/invoices/InvoicesTab.tsx`** -- Add `projectStatus` prop; show blocking banner when not active

### Updated Hook Interface

```typescript
export interface ProjectReadiness {
  percent: number;
  checklist: ReadinessItem[];
  loading: boolean;
  recalculate: () => void;
  creatorOrgType: 'GC' | 'TC' | null;
  isActive: boolean;
}
```

### Blocking Banner Component

A reusable alert shown in WO/PO/Invoice tabs:
```
[AlertTriangle icon] Project setup incomplete. Waiting for required parties.
```

### Key Behavioral Rules

- No manual activation -- project transitions to `active` automatically
- FC users still do NOT see the readiness card (existing behavior preserved)
- Supplier users still do NOT see the readiness card (existing behavior preserved)
- The `handleStatusChange` in ProjectHome will be restricted to prevent manual `active` status changes
- Existing features (financial charts, attention banner, operational summary) remain unchanged
- The readiness card only shows for `setup` status projects (not `draft`)

