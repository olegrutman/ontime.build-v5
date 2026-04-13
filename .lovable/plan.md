

# Full Audit: Rules, Hooks, and RLS Policies

## System Architecture — Two Separate Permission Models

The codebase has **two independent permission systems** that don't talk to each other:

### 1. `RolePermissions` (Active, Enforced)
**Location**: `src/types/organization.ts` + `src/hooks/useAuth.tsx`
- 12 boolean flags: `canViewRates`, `canApprove`, `canCreateChangeOrders`, etc.
- Computed via `getEffectivePermissions()`: role defaults → overridden by `member_permissions` DB row → admin gets all
- Used by `RequirePermission` component, `usePermission` hook
- **Only used in 2 places**: `ProjectContractsSection` (checks `canInviteMembers`) and `ContractSOVEditor` / `ProjectSOVEditor` (uses `RequireOrgType`)
- **Most features ignore it entirely** — CO creation, invoice submission, PO creation, etc. do NOT check these permissions

### 2. `DEFAULT_ROLE_RULES` (Display Only, NOT Enforced)
**Location**: `src/constants/defaultRoleRules.ts` + `src/pages/platform/PlatformRoles.tsx`
- 24 rules across SOV, Change Orders, Invoices, Contracts, Dashboard, Projects
- Stored in `platform_settings` as JSON
- **Only rendered** on the PlatformRoles admin page as a toggleable table
- **Zero enforcement** — no hook, no component, no guard reads these rules at runtime

---

## RLS Policy Audit — Change Orders

### `change_orders` table
| Operation | Policy | Assessment |
|-----------|--------|------------|
| SELECT | `can_access_change_order(id)` (SECURITY DEFINER) | Correct — checks org_id, assigned_to_org_id, and collaborators |
| SELECT | Direct: `user_in_org(org_id) OR user_in_org(assigned_to_org_id)` | Redundant with above but harmless (both PERMISSIVE) |
| INSERT | `user_in_org(auth.uid(), org_id)` | Correct |
| UPDATE (owner) | `user_in_org(auth.uid(), org_id)` | Correct |
| UPDATE (assigned) | 3 separate policies for shared/submitted/approved states | Correct — status transitions are gated |

### `co_line_items`, `co_labor_entries`, `co_material_items`, `co_equipment_items`
- SELECT: `can_access_change_order(co_id)` — Correct
- INSERT: `user_in_org(auth.uid(), org_id)` — Correct
- UPDATE/DELETE: `user_in_org(auth.uid(), org_id)` — Correct

### `change_order_collaborators`
- SELECT: `can_access_change_order(co_id)` — Correct
- **No INSERT/UPDATE/DELETE policies** — collaborators are managed exclusively via RPC functions (SECURITY DEFINER), which is correct

### `can_access_change_order` function (SECURITY DEFINER)
```text
Grants access if:
  1. User is in the creator org (org_id)
  2. User is in the assigned org (assigned_to_org_id)  
  3. User is in an org that is an 'active' or 'completed' collaborator
```
This is correct and covers the FC collaboration flow.

---

## Bugs Found

### Bug 1: FC CO Visibility — Likely Working But Untestable
The CO `6d45bab6` (TC-created, draft) has FC_Test as an active collaborator. RLS via `can_access_change_order` should grant access. FCHomeScreen was recently patched to include `draft` status. **This fix may not have been tested yet by the user.**

### Bug 2: `RolePermissions` Are Largely Unused (Major Gap)
Despite defining 12 permission flags, almost no feature checks them:
- `canCreateChangeOrders` — never checked before opening CO wizard
- `canApprove` — never checked before approving a CO
- `canCreatePOs` — never checked before PO creation
- `canViewRates` / `canViewMargins` — never checked in financial views
- `canSubmitTime` — never checked in labor entry forms

Only `canInviteMembers` is checked (in `ProjectContractsSection`).

### Bug 3: `DEFAULT_ROLE_RULES` Are Dead Code
The 24 rules on the PlatformRoles page are never enforced. An admin can toggle `co_create` to false for TC but TCs can still create COs freely.

### Bug 4: `useCORoleContext` — FC `canEdit` Too Narrow
Line 68: `isCollaboratorOrg` only checks `c.status === 'active'`. Once FC submits (status → `completed`), `canEdit` becomes false. This is **intentional** for the submission flow but means FC can't make corrections after submitting without TC resetting the collaborator status.

### Bug 5: No `canCreateRFIs` DB Column Wired
`PERMISSION_TO_DB_COLUMN` maps `canCreateRFIs` to `null` with the comment "DB column exists but types not yet regenerated". The `member_permissions` table has `can_create_rfis` but it's not wired into the permission merge logic.

---

## Recommended Plan (Bug Fixes Only)

### 1. Wire `canCreateRFIs` into `PERMISSION_TO_DB_COLUMN`
Change `canCreateRFIs: null` → `canCreateRFIs: 'can_create_rfis'` in `organization.ts` line 122.

### 2. Add permission checks to key CO actions
- Check `canCreateChangeOrders` before opening CO wizard in `COListPage.tsx`
- Check `canApprove` before showing approve/reject buttons in `CODetailLayout.tsx`

### 3. Verify FC CO visibility end-to-end
The `draft` status was just added to FCHomeScreen filters. Confirm the FC user can now see the CO by testing as FC. If the issue persists, the problem would be in the RLS layer (which looks correct in this audit).

### Files to modify
- `src/types/organization.ts` — fix `canCreateRFIs` mapping
- `src/components/change-orders/COListPage.tsx` — add `canCreateChangeOrders` check
- `src/components/change-orders/CODetailLayout.tsx` — add `canApprove` check on action buttons

