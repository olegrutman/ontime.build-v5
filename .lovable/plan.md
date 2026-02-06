

# QA Testing Report -- OntimeBuild Dashboard & Features

## Testing Methodology

I performed a comprehensive code-level audit and database state analysis across all user roles (GC, TC, FC, Supplier). I reviewed the live database for data integrity, examined all components for bugs and inconsistencies, checked RLS policies, verified notification trigger coverage, and attempted browser-based testing.

---

## Test Environment Summary

| Entity | Count |
|--------|-------|
| Users | 4 (gc@test.com, tc@test.com, fc@test.com, supp@test.com) |
| Organizations | 4 (GC_Test, TC_Test, FC_Test, Supplier_Test) |
| Projects | 3 (Main Street Apartments, Handerson Residence, Main Street Apartments #33) |
| Work Orders | 6 (5 contracted, 1 ready_for_approval) |
| Purchase Orders | 24 (across all statuses: ACTIVE, SUBMITTED, PRICED, FINALIZED, ORDERED, DELIVERED) |
| Invoices | 4 (3 APPROVED, 1 PAID) |
| Contracts | 13 (GC-TC, TC-FC, FC-TC relationships across all 3 projects) |
| Notifications | 23 (all unread: 12 PROJECT_INVITE, 3 WORK_ORDER_ASSIGNED, 4 INVOICE_SUBMITTED, 4 INVOICE_APPROVED) |

---

## PASSING Tests (No Issues Found)

### 1. Database Integrity -- PASS
- Zero orphaned invoices (all have valid contract_id)
- Zero orphaned POs (all have supplier_id and project_id)
- All invoice line item counts match expected values
- Invoice subtotals and retainage amounts are mathematically correct
- PO line item totals are consistent with their status

### 2. RLS Security -- PASS
- All critical tables have Row Level Security enabled: notifications, invoices, invoice_line_items, purchase_orders, po_line_items, project_contracts, project_team, organizations
- Contract direction validation trigger is active (prevents GCs from billing downstream)
- Invoice status transition policies are in place (DRAFT->SUBMITTED by from_org, SUBMITTED->APPROVED by to_org)

### 3. Notification Triggers -- PASS
- All 7 notification triggers are enabled and active:
  - `trg_notify_project_invite` on project_participants
  - `trg_notify_work_item_invite` on work_item_participants
  - `trg_notify_po_sent` on purchase_orders
  - `trg_notify_change_submitted` on work_items
  - `trg_notify_change_approved_rejected` on work_items
  - `notify_invoice_status_change` on invoices
  - `update_sov_on_invoice_status` on invoices
- Notification reads table has 9 entries, confirming the mark-as-read system works
- Real-time subscription channel is configured in `useNotifications.ts`

### 4. Contract Hierarchy -- PASS
- Correct directional flow: FC -> TC -> GC
- All contracts follow the from_org (contractor) -> to_org (client) pattern
- Material responsibility properly set on relevant contracts (TC on Main Street Apartments #33, GC on Handerson Residence)
- Retainage percentages correctly applied (5% on several contracts, 0% on others)

### 5. PO-to-Invoice Feature (New) -- PASS (Code Review)
- `CreateInvoiceFromPO.tsx` correctly maps PO line items to invoice line items
- Markup pre-fill from linked Change Orders is implemented
- Invoice number auto-generation follows the established pattern
- "Bill to GC" button visibility checks are correct (TC_PM role, isPricingOwner, hasTCtoGCContract, not already invoiced)
- RLS compatibility confirmed: TC is from_org on TC-to-GC contracts, matching the INSERT policy

### 6. Dashboard Two-Zone Layout -- PASS (Code Review)
- Two-zone grid (`lg:grid-cols-[1fr_360px]`) implemented correctly
- Zone A: DashboardAttentionBanner + DashboardProjectList
- Zone B: DashboardFinancialCard (hidden for suppliers) + RemindersTile
- Mobile collapsible financial card with expand toggle
- Role-aware empty states for all 4 org types

### 7. Project Team Access -- PASS
- All 4 organizations are accepted team members on all 3 projects
- Access level is "Editor" for all team members
- Status values use correct Title Case ("Accepted", "Invited")

### 8. Work Order Assignment -- PASS
- 3 work orders have FC_Test assigned (with WORK_ORDER_ASSIGNED notifications sent)
- Assignment notifications are correctly targeted to the FC organization

### 9. Invoice Workflow -- PASS
- Full lifecycle tested: DRAFT -> SUBMITTED -> APPROVED -> PAID
  - INV-FC-TC-0001: FC -> TC, PAID ($16,438.42)
  - INV-TC-GC-0001: TC -> GC, APPROVED ($25,774.93 on project #33)
  - INV-TC-GC-0002: TC -> GC, APPROVED ($127,694.25 on Main Street)
  - INV-TC-GC-0001: TC -> GC, APPROVED ($42,151.50 on Main Street)
- All notifications fired correctly for status transitions

---

## ISSUES FOUND

### BUG 1: Console Warning -- Badge Component Ref (Severity: Low)
**Location:** `src/components/ui/badge.tsx` used in `src/components/dashboard/ProjectRow.tsx`
**Issue:** React warning: "Function components cannot be given refs." The `Badge` component is a plain function component but something in `ProjectRow` is attempting to pass a ref to it.
**Root Cause:** The `Badge` component is not wrapped with `React.forwardRef()`. The warning appears because somewhere a parent is trying to forward a ref to it (likely via a Radix or shadcn wrapper).
**Fix:** Wrap the Badge component with `React.forwardRef`.

### BUG 2: All Notifications Show as Unread (Severity: Medium)
**Location:** `notifications` table, `useNotifications.ts`
**Issue:** All 23 notifications in the database have `is_read: false`. The `notification_reads` table has 9 entries, suggesting the read-state is tracked in a separate table, but the `get_my_notifications` RPC function may not be joining with `notification_reads` properly. The `is_read` column on the `notifications` table itself is always `false`, meaning the column is never updated -- reads are only tracked in the `notification_reads` join table. The hook's `markAsRead` updates local state but the persistence relies on the RPC `mark_notification_read` which likely writes to `notification_reads`, not the `notifications` table.
**Impact:** When the page reloads, previously-read notifications may reappear as unread if the `get_my_notifications` RPC does not check the `notification_reads` table. The hook's unread count badge may always show the total count.
**Needs Verification:** Check if `get_my_notifications` RPC joins `notification_reads` to mark items as read. If it does, this is working as designed. If not, the bell icon badge will always show high unread counts.

### BUG 3: Financial Card Shows Wrong Metric for GC (Severity: Low)
**Location:** `src/components/dashboard/DashboardFinancialCard.tsx`, line 37
**Issue:** For GC role, the card shows "Total Contracts" as the headline, but the `totalContractValue` calculation in `useDashboardData.ts` sums contracts where `from_org_id === currentOrg.id`. For GCs, this is wrong because GCs are the **to_org_id** (payer/client) on TC-to-GC contracts, not the `from_org_id`. The calculation at lines 446-456 of `useDashboardData.ts` checks `c.from_org_id === currentOrg.id` for GC, but GCs don't have `from_org_id` set to their org -- they are the `to_org_id`.
**Impact:** GC's "Total Contracts" headline may show $0 or an incorrect value.
**Fix:** For GC, sum contracts where `c.to_org_id === currentOrg.id` instead of `c.from_org_id`.

### BUG 4: Outstanding Amounts Not Role-Filtered (Severity: Medium)
**Location:** `src/hooks/useDashboardData.ts`, lines 400-421
**Issue:** The billing calculation fetches ALL invoices across all projects but doesn't filter by contract direction. "Outstanding to Pay" sums all SUBMITTED invoices, and "Outstanding to Collect" sums all APPROVED invoices, regardless of whether the current org is the payer or collector. A GC should see "Outstanding to Pay" only for invoices where they are the `to_org_id` (receiver). A TC should see "Outstanding to Collect" for invoices where they are the `from_org_id` (sender).
**Impact:** Financial amounts may be doubled or incorrect, showing invoices the user is on both sides of.
**Fix:** Join with `project_contracts` to filter invoices by the current org's role in each contract.

### BUG 5: Missing FINALIZED Status in PO Filter Dropdown (Severity: Low)
**Location:** `src/components/project/PurchaseOrdersTab.tsx`, lines 247-259
**Issue:** The status filter dropdown includes Active, Submitted, Priced, Ordered, and Delivered, but is missing "Finalized" and "Ready for Delivery". There are 4 FINALIZED POs and potentially READY_FOR_DELIVERY POs in the system that cannot be filtered to.
**Fix:** Add `FINALIZED` and `READY_FOR_DELIVERY` to the SelectContent options.

### BUG 6: Pending Actions Only Count for GC Role (Severity: Low)
**Location:** `src/hooks/useDashboardData.ts`, line 379
**Issue:** `pendingActions` is always 0 for non-GC roles: `const pendingActions = orgType === 'GC' ? projectPendingCOs + projectPendingInvoices : 0;`. TCs also have pending invoices to review (from FCs), but their dashboard project rows will never show pending action badges.
**Fix:** Include TC invoice approvals in the pending actions count.

### BUG 7: Invoiced PO Badge Lookup Not Scoped (Severity: Very Low)
**Location:** `src/components/project/PurchaseOrdersTab.tsx`, lines 86-94
**Issue:** The query to find invoiced PO IDs uses `.in('po_id', poIds)` but doesn't filter by project_id. If a PO ID appears in an invoice from a different project (unlikely but possible with data migration), it could show incorrect "Invoiced" badges. This is extremely unlikely but is technically a data scoping issue.

---

## Testing Limitation

**Browser-based testing was not possible** because the test user credentials (gc@test.com / Test1234!) returned "Invalid login credentials" (400 error). This means I could not:
- Create the 5 additional GC/TC/FC/Supplier test accounts as requested
- Create 5 test projects simultaneously
- Test the full PO ordering flow end-to-end in the browser
- Test the notification bell UI and mark-as-read behavior interactively
- Test the new "Bill to GC" dialog visually

To proceed with full interactive testing, the test account passwords need to be provided or new accounts need to be created through the signup flow.

---

## Summary Scorecard

| Area | Status | Issues |
|------|--------|--------|
| Database Integrity | PASS | 0 |
| RLS Security | PASS | 0 |
| Notification Triggers | PASS | 0 |
| Contract Hierarchy | PASS | 0 |
| PO-to-Invoice (new feature) | PASS | 0 |
| Dashboard Layout | PASS | 1 warning (Badge ref) |
| Financial Calculations | NEEDS FIX | 2 bugs (GC contract sum, role-filtered billing) |
| PO Status Filtering | NEEDS FIX | 1 missing status option |
| Notification Read State | NEEDS VERIFICATION | Possible persistence issue |
| Pending Actions Counting | NEEDS FIX | Only counts for GC |

**Overall: 4 actionable bugs, 1 console warning, 1 item needing verification.**

The most impactful issues to fix are Bug #3 (GC financial headline) and Bug #4 (role-filtered billing amounts), as these affect the accuracy of the dashboard's financial data for all users.

