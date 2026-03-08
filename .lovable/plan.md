
# Permission System Bug Report

Here are the bugs and issues I found after reviewing the permission system code:

---

## Bug 1: Multi-Org Users Only Get Permissions for Their First Organization

**Where:** `useAuth.tsx` lines 63-69 and 160-162

**Problem:** When a user belongs to multiple organizations (e.g., they're a TC_PM in one org and a SUPPLIER in another), the system only fetches `member_permissions` for the first org role (`rolesResult.data[0].id`) and only uses the first role as `currentRole`. There is no way to switch between organizations. The order of `userOrgRoles` is not explicitly sorted, so which org "wins" depends on database insertion order — it is unpredictable.

**Impact:** A user who is an Admin in their second org but a regular member in their first org would never see their admin privileges. Their permissions, role, and sidebar options are all wrong.

---

## Bug 2: Sidebar Bypasses the Effective Permission System

**Where:** `AppSidebar.tsx` line 67

**Problem:** The sidebar checks `ROLE_PERMISSIONS[currentRole]?.canManageOrg` directly instead of using the unified `permissions` object from `useAuth()`. This means if a platform admin has toggled `can_manage_team` off for a specific user via `member_permissions`, the sidebar still shows the "Manage Org" link because it reads from role defaults, not the effective (merged) permissions.

**Impact:** Users see navigation items they shouldn't have access to based on their actual granted permissions.

---

## Bug 3: POSummaryCard Uses Wrong Role Format

**Where:** `POSummaryCard.tsx` lines 80-83

**Problem:** This component compares roles against full strings like `'Field Crew'`, `'Trade Contractor'`, `'General Contractor'` — but the `project_team.role` column uses those full strings, while the rest of the app uses `AppRole` codes (`GC_PM`, `TC_PM`, `FC_PM`). This is a naming inconsistency. If the project_team table ever changes format, or if someone maps roles wrong, pricing visibility breaks silently.

**Impact:** Not a crash bug today, but a fragile design that can cause FC users to see pricing they shouldn't, or TC/GC users to lose pricing visibility if the role string doesn't match exactly.

---

## Bug 4: Work Order Creation Permission Check Ignores `canCreateWorkOrders`

**Where:** `ChangeOrders.tsx` line 44

**Problem:** The "can create" check is `currentRole === 'GC_PM' || currentRole === 'TC_PM'` — a hard-coded role check. It ignores the `canCreateWorkOrders` permission flag entirely. If a platform admin revokes `can_create_work_orders` for a specific TC user via member_permissions, that user can still see and use the Create button.

**Impact:** Permission overrides from the admin panel have no effect on work order creation.

---

## Bug 5: Several Components Hard-Code Role Checks Instead of Using Permissions

**Where:** Multiple files including `TMPeriodActions.tsx`, `ChangeWorkDetail.tsx`, `EstimateApprovals.tsx`, `OrderApprovals.tsx`

**Problem:** These components check `currentRole === 'GC_PM'` or `currentRole === 'TC_PM'` directly instead of using the permission system. For example:
- `TMPeriodActions.tsx`: submit/approve/reject actions are gated by role strings, not by `canApprove` or `canSubmitTime`
- `ChangeWorkDetail.tsx`: pricing edit is `currentRole === 'TC_PM'` instead of checking permissions
- `OrderApprovals.tsx`: page access is `currentRole === 'GC_PM'` only

**Impact:** The granular permission toggles that admins can set in the admin panel (or via UserPermissionsCard) are effectively ignored for these workflows. Revoking a permission in the admin panel gives a false sense of security.

---

## Bug 6: `getEffectivePermissions` Falls Back to SUPPLIER Permissions for Null Role

**Where:** `organization.ts` line 242

**Problem:** When `role` is null (no org membership), the function returns `ROLE_PERMISSIONS.SUPPLIER` as a fallback. SUPPLIER permissions include `canManageOrg: true` and `canCreateRFIs: true`. A user with no role should have zero permissions, not supplier-level permissions.

**Impact:** Edge case where a user without any org role might be granted supplier-level manage and RFI permissions.

---

## Bug 7: Console Error — SashaMessage and SashaHighlightOverlay Missing forwardRef

**Where:** `SashaBubble.tsx`, `SashaMessage.tsx`, `SashaHighlightOverlay.tsx`

**Problem:** React warns that function components cannot be given refs. The SashaBubble component passes refs to SashaMessage and SashaHighlightOverlay, but neither uses `React.forwardRef()`.

**Impact:** Not a permissions bug, but it causes console errors on every page load and could break tooltip/popover positioning.

---

## Summary of Recommended Fixes

1. **Add org switcher** or at minimum sort `userOrgRoles` deterministically and fetch permissions for the active org
2. **Replace all hard-coded role checks** (`currentRole === 'GC_PM'`) with permission-based checks (`permissions?.canApprove`) throughout the codebase
3. **Fix null-role fallback** to return all-false permissions instead of SUPPLIER defaults
4. **Fix sidebar** to use `permissions` from `useAuth()` instead of reading `ROLE_PERMISSIONS` directly
5. **Fix forwardRef warnings** in Sasha components
