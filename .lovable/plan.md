
# CO/WO Process — End-to-End Bug Report

## CRITICAL BUGS

### BUG 1: Picker v3 does NOT save to database
**Severity: BLOCKER**
`PickerShell.tsx` line 80 — `handleSubmit` only dispatches `SET_SUBMITTED` and shows a toast. It never calls `supabase.from('change_orders').insert(...)`. The wizard shows a success screen with "Submitted Work Order" but **nothing is persisted**. The `// In real implementation, create the CO in the database here` comment confirms this is unfinished.

**Impact:** Every CO/WO created via the new Picker v3 is lost on page reload.

### BUG 2: Missing RLS policies on `change_order_collaborators`
**Severity: HIGH**
The table only has a **SELECT** policy (`CO collaborators readable by participants`). There are **no INSERT, UPDATE, or DELETE** policies. This means:
- TCs cannot invite FCs (no INSERT)
- Collaborator status cannot be updated (no UPDATE for accept/decline)
- Collaborators cannot be removed (no DELETE)
- The `request_fc_change_order_input` RPC may work via SECURITY DEFINER, but direct SDK calls will fail silently.

### BUG 3: `co_sov_items` RLS uses raw subquery, not `can_access_change_order`
**Severity: MEDIUM**
All four policies (SELECT, INSERT, UPDATE, DELETE) on `co_sov_items` use `org_id IN (SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid())`. This means:
- A collaborator org (FC invited by TC) **cannot** view SOV items even if they are a valid participant on the CO.
- Inconsistent with other CO child tables that use `can_access_change_order(co_id)` for SELECT.

---

## MODERATE BUGS

### BUG 4: `forwardRef` warnings on `COStickyFooter` and `AddScopeItemButton`
**Severity: LOW (console noise)**
`CODetailLayout` passes refs to function components (`COStickyFooter`, `AddScopeItemButton`) that don't use `React.forwardRef()`. This produces console errors on every CO detail page load.

### BUG 5: `co_nte_log` RLS uses raw subquery instead of helper
**Severity: LOW**
SELECT/INSERT/UPDATE policies on `co_nte_log` use inline `user_org_roles` subqueries checking both `org_id` and `assigned_to_org_id`. This works but is inconsistent with the `can_access_change_order` pattern used everywhere else, and doesn't cover FC collaborators.

### BUG 6: Picker v3 role detection is fragile
**Severity: MEDIUM**
`PickerShell.tsx` line 34 — `const membership = userOrgRoles[0]` takes only the first org role. Users with multiple org memberships could get the wrong role detected, leading to incorrect routing chains and visibility.

### BUG 7: Picker v3 missing `ProjectShell` wrapper
**Severity: LOW-MEDIUM**
The `/project/:id/change-orders/new` route renders `COPickerV3Page` directly inside `RequireAuth` but NOT inside `ProjectShell`. This means the persistent sidebar is missing, breaking the layout pattern established in the memory rules. However, this may be intentional for a full-screen wizard experience.

### BUG 8: `co_line_items` DELETE/UPDATE use raw subquery
**Severity: LOW**
DELETE and UPDATE policies on `co_line_items` use `org_id IN (SELECT organization_id FROM user_org_roles ...)` instead of the `user_in_org()` helper used in INSERT. Functionally equivalent but inconsistent pattern.

---

## VERIFIED WORKING

- **CO List page**: Loads correctly, shows 17 COs, filters work, stats calculate properly
- **CO Detail page**: Pipeline status visualization, KPI strip, scope items, approve/reject buttons all render correctly for the submitted CO
- **Navigation**: List -> Detail -> Back to List all work; "New CO" button navigates to Picker v3
- **Picker v3 UI**: All 9 steps render, location/system selection works, Why step categories display correctly, Who step shows TC assignment with routing chain, role switcher present
- **`useChangeOrders` hook**: Fetches COs, maps collaborators, handles board column grouping correctly
- **`useChangeOrderDetail` hook**: All sub-queries (line items, labor, materials, equipment, NTE, activity, collaborators) are properly structured
- **Financial calculations**: `grandTotal`, `profitMargin`, `nteUsedPercent` formulas verified correct
- **RLS on core tables**: `change_orders`, `co_line_items`, `co_labor_entries`, `co_material_items`, `co_equipment_items`, `co_activity`, `co_scope_evidence` all have complete CRUD policies

---

## RECOMMENDED FIX PRIORITY

1. **BUG 1** — Wire Picker v3 submit to actually persist the CO (BLOCKER)
2. **BUG 2** — Add INSERT/UPDATE/DELETE policies on `change_order_collaborators`
3. **BUG 3** — Align `co_sov_items` SELECT policy to use `can_access_change_order`
4. **BUG 6** — Fix role detection to be project-context-aware
5. **BUG 4** — Add `forwardRef` to `COStickyFooter` and `AddScopeItemButton`
6. **BUG 5/8** — Standardize remaining RLS policies to use helpers
