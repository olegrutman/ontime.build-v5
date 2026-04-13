

# Full Application Audit: Bugs, Security Issues, and Conflicts

## Executive Summary
After auditing all pages, hooks, RLS policies, and permission logic across the entire app, I found **19 issues** spanning security vulnerabilities, dead code, conflicting logic, and missing enforcement. Here they are organized by severity.

---

## CRITICAL Security Issues

### 1. Three tables with RLS enabled but ZERO policies (all operations blocked)
**Tables**: `material_orders`, `order_items`, `tm_billable_slices`

These tables are actively used by MaterialOrderWizard, MaterialOrders page, OrderApprovals page, and PurchaseOrders page. But since RLS is on with no policies, **every SELECT/INSERT/UPDATE will silently return empty or fail**. Users cannot create material orders, view them, or approve them.

**Fix**: Add proper RLS policies scoped to org membership.

### 2. Three contract scope tables are wide open
**Tables**: `contract_scope_details`, `contract_scope_exclusions`, `contract_scope_selections`

All have `USING (true) / WITH CHECK (true)` for ALL operations. Any logged-in user can read, edit, or delete any contract scope data from any project they're not part of.

**Fix**: Replace with project-participant-scoped policies.

### 3. Multi-org user always uses first org (hardcoded `[0]`)
51 files use `userOrgRoles[0]` to determine the current org. If a user belongs to multiple organizations, they are permanently locked to their first-created org with no way to switch. This causes:
- Wrong org context when viewing projects from a second org
- Incorrect permission resolution (permissions are fetched only for `sortedRoles[0]`)
- CO/invoice/PO operations targeting the wrong org_id

This is a systemic architectural issue. Not fixable in one pass but should be acknowledged.

---

## HIGH Priority Bugs

### 4. Permission system is defined but almost never enforced
12 permissions exist (`canViewRates`, `canApprove`, `canViewInvoices`, `canCreatePOs`, etc.). Only 4 are actually checked anywhere:
- `canInviteMembers` (ProjectContractsSection)
- `canCreateChangeOrders` (COListPage — recently added)
- `canApprove` (CODetailLayout — recently added, OrderApprovals page)
- `canCreateRFIs` (RFIsTab)

**Not enforced anywhere**:
- `canViewRates` — financial views show rates to everyone
- `canViewMargins` — margin KPIs shown to everyone
- `canViewInvoices` — invoice tab visible to everyone
- `canCreatePOs` — PO creation button shown to everyone
- `canSubmitTime` — time entry forms open to everyone
- `canManageOrg` — only partially checked via `canInviteMembers` mapping
- `canAddHoursEstimates` — never checked
- `canAddMaterialLists` — mapped to null (always allowed)

**Fix**: Wire every permission into its corresponding UI gate. Specific locations listed in the technical section below.

### 5. `RequireOrgType` maps FS role to TC incorrectly for FC orgs
In `RequireOrgType`, the `FS` role is hardcoded to org type `TC` (line 109). But FC organizations can also have FS members (per `ALLOWED_ROLES_BY_ORG_TYPE`). An FS user in an FC org will be treated as TC, seeing wrong UI and potentially accessing wrong data.

**Fix**: Resolve org type from `userOrgRoles[0].organization.type` instead of inferring from role.

### 6. DEFAULT_ROLE_RULES are completely dead code
24 platform-level rules can be toggled by platform admins on the PlatformRoles page, but zero enforcement exists. Toggling `co_create = false` for TC does nothing. There is no hook or guard that reads these rules.

**Fix**: Create a `useRoleRule(ruleId)` hook that reads from platform_settings and wire it into feature gates alongside the existing permission system.

### 7. `getEffectivePermissions` merge logic has a subtle override bug
The `PERMISSION_TO_DB_COLUMN` maps both `canViewRates` AND `canViewMargins` AND `canViewInvoices` to the same DB column `can_view_financials`. If an admin sets `can_view_financials = false` for a member, it disables ALL three permissions simultaneously — there's no way to allow viewing invoices but hide rate/margin data.

Similarly, `canManageOrg` and `canInviteMembers` both map to `can_manage_team` — you can't separate org management from invite ability.

And `canAddHoursEstimates` and `canSubmitTime` both map to `can_submit_time`.

**Fix**: Either add separate DB columns for granular control, or document this as intentional grouping.

---

## MEDIUM Priority Issues

### 8. `member_permissions` has no INSERT policy
Only SELECT and UPDATE policies exist. The initial `member_permissions` row must be created by a trigger or RPC — if that mechanism breaks, there's no way for admins to create permission rows via the client.

### 9. Impersonation stores session in sessionStorage
`useImpersonation.ts` stores the original platform owner's access_token and refresh_token in `sessionStorage`. While better than localStorage (cleared on tab close), any XSS vulnerability would allow session theft. The tokens should ideally be kept server-side.

### 10. `platform_users` has only SELECT policy — no UPDATE
Platform users can be viewed but not updated via the client. The 2FA verification flow and role changes must go through RPCs — verify this is the case.

### 11. Invoice tab never checks `canViewInvoices`
`InvoicesTab.tsx` renders for all roles. An FS (Field Supervisor) with `canViewInvoices: false` still sees all invoices.

### 12. PO creation page never checks `canCreatePOs`
`PurchaseOrders.tsx` and `PurchaseOrdersTab.tsx` don't gate the creation flow behind the `canCreatePOs` permission.

### 13. Daily log visibility uses `project_team` instead of `project_participants`
RLS on `daily_logs` joins through `project_team` + `user_org_roles`. The documented source of truth for membership is `project_participants`. If `project_team` is stale or incomplete, users may not see logs.

---

## LOW Priority / Code Quality

### 14. Duplicate SELECT policies on invoice_line_items
Two overlapping SELECT policies exist: one using `user_in_org()` helper, another using raw `user_org_roles` subquery. Both are PERMISSIVE so the broader one wins, making the narrower one dead weight.

### 15. `useFeatureAccess` defaults to enabled while loading
Line 40: `enabled: isLoading ? true : (feature?.enabled ?? true)` — features default to ON during load. This is intentional "graceful degradation" but means a brief window where gated features flash visible before being hidden.

### 16. `RequireOrgType` is only used in 2 SOV editors
The component exists but is barely utilized. If org-type gating is important, it should be used more broadly.

### 17. `canCreateRFIs` was recently wired but `canCreatePOs` button still not gated
The RFI tab correctly checks `canCreateRFIs`. But the PO wizard launch button has no corresponding check.

### 18. CO board view shows ALL COs regardless of org
`boardColumns` in `useChangeOrders.ts` (lines 147-151) pushes all COs into board columns without filtering by org. The grouped view correctly separates mine/shared, but the board does not.

### 19. `FCHomeScreen` myCOs filter may double-count
Line 67-70: COs where `org_id === orgId` OR `created_by_role === 'FC' && collaboratorOrgId === orgId`. If an FC-created CO has the FC as both org_id owner and collaborator, it appears once (no bug), but the intent of the second condition is unclear and may cause confusion in the future.

---

## Recommended Fix Plan

### Phase 1: Security (Critical)
1. Add RLS policies to `material_orders`, `order_items`, `tm_billable_slices`
2. Replace wide-open policies on contract scope tables with project-participant scoping
3. (No action on notifications per your preference)

### Phase 2: Permission Enforcement (All Features)
Wire every permission check into its UI gate:

| Permission | Where to enforce |
|---|---|
| `canViewRates` | Financial summary cards, rate columns in labor tables |
| `canViewMargins` | Margin KPI cards on dashboard and project overview |
| `canViewInvoices` | InvoicesTab render gate, invoice navigation items |
| `canCreatePOs` | PO creation buttons in PurchaseOrdersTab and PurchaseOrders page |
| `canSubmitTime` | Labor entry forms in CO detail, daily log panel |
| `canAddHoursEstimates` | Hour estimate inputs in CO wizard |
| `canManageOrg` | Org settings page, team management actions |

### Phase 3: Bug Fixes
4. Fix `RequireOrgType` to use actual org type instead of role inference
5. Fix CO board columns to filter by org
6. Add separate DB columns for `can_view_margins`, `can_view_invoices`, `can_invite_members` if granular control is desired (or document the grouping)

### Phase 4: Role Rules Enforcement
7. Create `useRoleRule(ruleId)` hook
8. Wire into feature gates for the 24 platform rules

### Files to modify
- **Migrations**: 3 new migration files for RLS policies
- **src/components/auth/RequirePermission.tsx**: Fix `RequireOrgType` org resolution
- **src/hooks/useChangeOrders.ts**: Filter board columns by org
- **src/components/invoices/InvoicesTab.tsx**: Add `canViewInvoices` gate
- **src/pages/PurchaseOrders.tsx**: Add `canCreatePOs` gate
- **src/components/project/PurchaseOrdersTab.tsx**: Add `canCreatePOs` gate
- **src/components/daily-log/DailyLogPanel.tsx**: Add `canSubmitTime` gate
- **src/components/change-orders/CODetailLayout.tsx**: Add `canViewRates` gate on financial sections
- **src/components/dashboard/***: Add `canViewMargins` gate on KPI cards
- **src/components/project/*Overview*.tsx**: Add financial visibility gates
- **New hook**: `src/hooks/useRoleRule.ts` for platform rule enforcement
- **~15 component files**: Add `usePermission` checks at render boundaries

