

# Allow Suppliers to Create Projects & Invite GC/TC

## Problem

The `canCreateProject` gate is hardcoded to `orgType === 'GC' || orgType === 'TC'`, blocking suppliers. The supplier dashboard renders without a "New Project" button. The wizard's `creatorRole` mapping also returns `null` for suppliers.

## Changes

### 1. `src/pages/Dashboard.tsx`

- Line 176: Change `canCreateProject` to include `'SUPPLIER'`:
  ```ts
  const canCreateProject = orgType === 'GC' || orgType === 'TC' || orgType === 'SUPPLIER';
  ```
- Line 182: Add `showNewButton` and `onNewClick` props to the Supplier `AppLayout` (same as GC/TC).

### 2. `src/pages/CreateProjectNew.tsx`

- Line 50-51: Add supplier to the `creatorRole` mapping:
  ```ts
  const creatorRole = currentOrg?.type === 'GC' ? 'General Contractor' :
                      currentOrg?.type === 'TC' ? 'Trade Contractor' :
                      currentOrg?.type === 'SUPPLIER' ? 'Supplier' : null;
  ```
- Line 114-116: The `project_participants` insert already uses `currentOrg.type as any` for role, so supplier is handled.
- Line 121-124: The `roleLabel` mapping already includes `'Supplier'` as the fallback — no change needed.

### 3. `src/components/project-wizard-new/TeamStep.tsx`

- The `AddTeamMemberDialog` filters available invite roles based on `creatorOrgType`. Need to verify it allows suppliers to invite GC and TC roles.

### 4. `src/components/dashboard/DashboardProjectList.tsx`

- Line 222: Update `canCreateProject` to include `'SUPPLIER'`.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Add SUPPLIER to `canCreateProject`; add `showNewButton`/`onNewClick` to Supplier AppLayout |
| `src/pages/CreateProjectNew.tsx` | Add SUPPLIER to `creatorRole` mapping |
| `src/components/dashboard/DashboardProjectList.tsx` | Add SUPPLIER to `canCreateProject` |
| `src/components/project/AddTeamMemberDialog.tsx` | Ensure supplier creators can invite GC and TC roles |

