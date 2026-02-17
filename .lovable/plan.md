

# Permissions Audit: Current State and Recommended Fixes

## Current Situation

There are **two disconnected permission systems** in the app:

### System 1: Role-Based (Hardcoded) -- ACTIVELY USED
The `ROLE_PERMISSIONS` map in `src/types/organization.ts` assigns fixed permissions per role (GC_PM, TC_PM, FC_PM, FS, SUPPLIER). These are checked throughout the app via:
- `RequirePermission` component (used in SOV editors, contracts section)
- `usePermission` hook (used in ProjectContractsSection)
- Direct `permissions?.canViewRates` checks (used in WorkItemPage, WorkItemLabor, TMLaborEntries, etc.)
- `ROLE_PERMISSIONS[currentRole]?.canManageOrg` (used in BottomNav for sidebar visibility)

### System 2: Member-Level (Database) -- NOT ENFORCED
The `member_permissions` table stores per-user toggles (`can_approve_invoices`, `can_create_work_orders`, etc.) that admins can edit in the MemberDetailDialog. However, **none of these flags are actually checked** anywhere in the app. They are only displayed and saved -- never used to gate any functionality.

## What Needs to Happen

The two systems need to be **unified** so that the granular member permissions set by admins actually control what users can do. Here is the mapping between database permissions and where they should be enforced:

| Database Permission | Where to Enforce | Current Behavior |
|---|---|---|
| `can_approve_invoices` | Invoice approve/reject buttons (InvoiceCard, InvoiceDetail) | Controlled only by org role (GC_PM gets `canApprove`) |
| `can_create_work_orders` | Work Order creation wizard, "New Work Order" buttons | Not gated at all beyond role-based sidebar visibility |
| `can_create_pos` | PO creation wizard, "New PO" buttons | Not gated at all |
| `can_manage_team` | Team page invite/edit actions | Gated by `is_admin` flag only |
| `can_view_financials` | Financial summaries, rate columns, margins | Controlled by `canViewRates`/`canViewMargins` from role |
| `can_submit_time` | Time entry forms in T&M periods | Not explicitly gated |

## Proposed Changes

### 1. Update `useAuth` to expose member permissions
Fetch the current user's `member_permissions` row alongside their org role and expose it in the auth context. Admins automatically get all permissions.

### 2. Update `RequirePermission` / `usePermission` to check member permissions
Instead of only checking the hardcoded `ROLE_PERMISSIONS` map, also check the user's `member_permissions` row from the database. The logic would be:
- If user is admin: all permissions granted
- Otherwise: check `member_permissions` flags

### 3. Create a unified permission key mapping
Map the role-based keys (`canApprove`, `canViewRates`, etc.) to the database column names (`can_approve_invoices`, `can_view_financials`, etc.) so existing `RequirePermission` usage continues to work.

### 4. Enforce permissions at key UI points
- **Invoice approve/reject**: Check `can_approve_invoices`
- **Work Order "New" button**: Check `can_create_work_orders`
- **PO "New" button**: Check `can_create_pos`
- **Team invite/manage**: Check `can_manage_team` OR `is_admin`
- **Financial data visibility**: Check `can_view_financials`
- **Time entry forms**: Check `can_submit_time`

### Files to modify

| File | Change |
|---|---|
| `src/hooks/useAuth.tsx` | Fetch user's `member_permissions` row; expose in context |
| `src/types/organization.ts` | Add unified permission mapping; update `RolePermissions` interface |
| `src/components/auth/RequirePermission.tsx` | Check `member_permissions` instead of/alongside `ROLE_PERMISSIONS` |
| `src/components/invoices/InvoicesTab.tsx` | Gate approve actions with `can_approve_invoices` |
| `src/components/project/WorkOrdersTab.tsx` | Gate "New Work Order" with `can_create_work_orders` |
| `src/components/project/PurchaseOrdersTab.tsx` | Gate "New PO" with `can_create_pos` |
| `src/pages/OrgTeam.tsx` | Gate invite/manage with `can_manage_team` or `is_admin` |
| `src/components/work-item/WorkItemPage.tsx` | Use unified permission check for financial visibility |
| `src/components/work-item/tm/TMLaborEntries.tsx` | Gate time submission with `can_submit_time` |

