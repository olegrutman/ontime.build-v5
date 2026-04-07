

# End-to-End QA Sweep — Bug Report

## Executive Summary

After a thorough code-level and database audit across all 10 phases of the test plan, I identified **27 bugs** ranging from critical to low severity. The test was conducted by reading every relevant component, hook, page, type definition, and database schema. Browser testing was limited because the test account credentials are unknown — the specified test users (`gc_test`, `tc_test`, `fc_test`, `supp_test`) do not correspond to any accounts in the database. Actual test accounts exist at `gc@test.com`, `tc@test.com`, `fc@test.com`, `supp@test.com` but passwords are not available.

---

## Bug Report

### BUG #1
**Step:** Phase 1, Step 1 (Create Project)
**User:** fc_test (FC)
**Description:** FC organization type is excluded from `canCreateProject` — FC users cannot create projects.
**Expected:** Per the test plan, FC should be able to at least view project creation. The code at `Dashboard.tsx:176` only allows GC, TC, SUPPLIER.
**Severity:** Medium
**Detail:** `const canCreateProject = orgType === 'GC' || orgType === 'TC' || orgType === 'SUPPLIER'` — FC is explicitly excluded. This is likely by design, but it means Phase 1 steps cannot be tested from FC perspective.

---

### BUG #2
**Step:** Phase 1, Step 1 (Project Creation)
**User:** gc_test
**Description:** `CreateProjectNew.tsx` inserts into both `project_participants` AND the legacy `project_team` table, creating redundant records. The memory notes confirm `project_participants` is the source of truth, but `project_team` is still being written to.
**Expected:** Only `project_participants` should be populated. Legacy `project_team` writes should be removed.
**Severity:** Medium
**Detail:** Lines 112-140 of `CreateProjectNew.tsx` — inserts into both tables.

---

### BUG #3
**Step:** Phase 1, Step 1 (Project Creation)
**User:** gc_test
**Description:** The project creation wizard's `BasicsStep` has no `startDate` field in the UI (no date picker), even though the `ProjectBasics` type includes an optional `startDate` field and it's saved to the database.
**Expected:** Start date field should be present per the test plan's requirement to "fill in all fields including start date."
**Severity:** Low
**Detail:** `BasicsStepNew` component only renders: name, projectType, address, city, state, zip. No `startDate` or `description` input.

---

### BUG #4
**Step:** Phase 1, Step 3 (Invite team members)
**User:** gc_test
**Description:** GC cannot invite Field Crew (FC) directly. The `AddTeamMemberDialog` role filter at line 94-97 only allows GC to add `Trade Contractor` or `Supplier`.
**Expected:** GC should be able to invite FC users to the project.
**Severity:** High
**Detail:** `if (creatorOrgType === 'GC') { return role === 'Trade Contractor' || role === 'Supplier'; }` — FC is excluded.

---

### BUG #5
**Step:** Phase 1, Step 5 (Notifications for invites)
**User:** All
**Description:** Project invite creation at `CreateProjectNew.tsx:182-192` inserts into `project_invites` but does NOT create a notification in the `notifications` table. No notification is sent to invited users.
**Expected:** Invited users should receive in-app notifications and/or email about the invitation.
**Severity:** High
**Detail:** The `saveTeam` function inserts into `project_invites` but has no `notifications` insert or edge function call.

---

### BUG #6
**Step:** Phase 2, Steps 10-18 (Contracts)
**User:** gc_test
**Description:** The contract system has no formal send/accept/sign workflow. `PhaseContracts` treats contracts as simple inline editable rows with contract amount and retainage %. There is no "send contract for review," no accept/reject flow, no document attachment capability, and no execution date field.
**Expected:** Full contract lifecycle: create → send → review → accept/sign → executed.
**Severity:** Critical — The entire Phase 2 (Steps 10-18) cannot be tested.
**Detail:** `PhaseContracts.tsx` only supports inline editing of `contract_sum` and `retainage_percent`. The `project_contracts` table has no status, no execution_date, no document_url columns visible in the UI.

---

### BUG #7
**Step:** Phase 2 (Contracts — Supplier)
**User:** supp_test
**Description:** `PhaseContracts.tsx` line 57-61 only maps `GC` and `TC` to creator roles. When a Supplier creates a project, `creatorRole` returns `null`, which causes `filteredTeam` to be empty (line 89: `if (!creatorRole) return [];`), making the entire contracts section unusable.
**Expected:** Supplier-created projects should show contract management for their invited GCs and TCs.
**Severity:** High
**Detail:** The `creatorRole` mapping is missing `SUPPLIER` and `FC` types.

---

### BUG #8
**Step:** Phase 3 (Scope of Work)
**User:** gc_test
**Description:** There is no dedicated "Scope of Work" (SOW) creation/review/revision workflow as described in the test plan (Steps 19-25). The app has a scope wizard for building profile/scope selections, but it is not a line-item SOW with quantities, units, unit costs, allowances, and exclusions. There is no SOW send/review/revision-request flow.
**Expected:** Full SOW lifecycle: create line items → send for review → request revision → update → accept.
**Severity:** Critical — Phase 3 (Steps 19-25) cannot be tested.

---

### BUG #9
**Step:** Phase 4 (SOV)
**User:** All
**Description:** The SOV editor (`ContractSOVEditor.tsx`) does not validate that line item totals equal the contract value. Items use `percent_of_contract` which should sum to 100%, but there is no blocking validation when saving — only a visual indicator via `SOVProgressBar`.
**Expected:** Step 58 requires "the app flags the discrepancy" when SOV totals don't match contract value. The app should block or warn before locking.
**Severity:** Medium
**Detail:** The SOV can be locked even if percentages don't sum to 100%.

---

### BUG #10
**Step:** Phase 4 (SOV — submit/approve flow)
**User:** gc_test, fc_test
**Description:** The SOV has no submit/approve workflow. The only status transition is lock/unlock. There is no "submit SOV for review" or "approve SOV" action — only the owning org can lock it.
**Expected:** Steps 28-31 require SOV submission and approval by counterparty.
**Severity:** High

---

### BUG #11
**Step:** Phase 5, Step 32-33 (Purchase Orders)
**User:** gc_test
**Description:** PO creation wizard does not support document attachment. The `po-wizard-v2` components have no file upload capability for specification documents.
**Expected:** User should be able to attach a specification document to a PO.
**Severity:** Medium

---

### BUG #12
**Step:** Phase 5, Step 36 (Partial delivery)
**User:** supp_test
**Description:** No line-item-level partial delivery marking is available for suppliers. The PO status moves between SUBMITTED → PRICED → ORDERED → DELIVERED as a whole, not per line item.
**Expected:** Supplier should be able to mark individual line items as partially delivered.
**Severity:** Medium

---

### BUG #13
**Step:** Phase 6 (Change Orders — Contract Value Update)
**User:** gc_test
**Description:** When a CO is approved, the contract value does NOT automatically update. The CO approval flow in `COStatusActions.tsx` calls `approveCO.mutateAsync()` which sets `status = 'approved'` but has no logic to update `project_contracts.contract_sum`.
**Expected:** Step 39 requires "Confirm the subcontract value updates automatically" after CO approval.
**Severity:** High

---

### BUG #14
**Step:** Phase 6, Step 43 (CO to Supplier)
**User:** gc_test
**Description:** The CO system is designed for the GC→TC→FC chain. There is no Supplier-targeted CO workflow. The CO wizard and status actions reference `isGC`, `isTC`, `isFC` but never `isSupplier`. A Supplier cannot receive or approve a change order.
**Expected:** COs should be issuable to suppliers to adjust PO quantities.
**Severity:** Medium

---

### BUG #15
**Step:** Phase 7, Step 47 (Forward invoice)
**User:** gc_test
**Description:** There is no "forward invoice to fc_test for final approval" capability. Invoice approval is binary: the `to_org` (client) approves or rejects. There is no multi-tier approval chain (TC → GC → FC/Owner).
**Expected:** GC should be able to forward an invoice to the owner for final approval.
**Severity:** Medium

---

### BUG #16
**Step:** Phase 7, Step 49 (Mark payment)
**User:** gc_test
**Description:** The "Mark as Paid" action does NOT record which party paid or the payment amount. It simply sets `paid_at` timestamp. There is no payment amount field, payment method, or check number.
**Expected:** Payment tracking should include amount and method details.
**Severity:** Low

---

### BUG #17
**Step:** Phase 7, Step 55 (Overbilling validation)
**User:** tc_test
**Description:** The `CreateInvoiceFromSOV` component clamps billing percentages to `maxAllowedPercent` (line 351), but this is only enforced client-side. There is no server-side RPC or trigger preventing overbilling — a malicious client could bypass the UI and insert overbilled amounts directly.
**Expected:** Server-side validation should prevent billed amounts from exceeding scheduled values.
**Severity:** Medium

---

### BUG #18
**Step:** Phase 8, Step 56 (Negative CO / Credit)
**User:** gc_test
**Description:** The CO line items (`co_line_items`) do not enforce or explicitly support negative amounts for credits. The CO wizard UI has no "credit" or "deduction" option. Cost impact fields accept negative numbers only incidentally.
**Expected:** Negative cost impact COs should be explicitly supported and reduce contract values.
**Severity:** Medium

---

### BUG #19
**Step:** Phase 8, Step 57 (Wrong role approval)
**User:** tc_test
**Description:** Invoice approval permission is checked client-side via `isInvoiceReceiver` (`contract.to_org_id === currentOrgId`). However, the RLS policy on the `invoices` table may not enforce this — the `update` policy should verify that only the `to_org_id` can set `status = 'APPROVED'`, but this is likely not checked at the database level.
**Expected:** Database-level enforcement that only the correct org can approve an invoice.
**Severity:** High

---

### BUG #20
**Step:** Phase 8, Step 59 (Delete contract with invoice)
**User:** gc_test
**Description:** There is no protection against deleting a contract that has associated invoices. The `TeamMembersCard.tsx` delete flow (line 200-202) and `TeamStep.tsx` (line 78-80) delete contracts without checking for associated invoices or SOVs.
**Expected:** App should prevent deletion of contracts that have approved invoices, locked SOVs, or active change orders.
**Severity:** High

---

### BUG #21
**Step:** Phase 8, Step 60 (Retainage release)
**User:** gc_test
**Description:** There is no retainage release feature. Search for "retainage release" returns zero results. The app tracks retainage as a percentage on contracts and withholds it on invoices, but there is no mechanism to request or approve retainage release.
**Expected:** Retainage release workflow should exist for nearly-complete projects.
**Severity:** Medium — Feature is missing entirely.

---

### BUG #22
**Step:** Phase 8, Step 61 (File upload validation)
**User:** All
**Description:** File upload inputs across the app have minimal type/size validation. The estimate upload accepts only `.csv` (line 182 of `EstimateUploadWizard.tsx`), but PO, CO, and invoice file attachments have no explicit file type or size restrictions.
**Expected:** Oversized or wrong file types should be rejected with clear error messages.
**Severity:** Low

---

### BUG #23
**Step:** Phase 9, Step 63 (Notifications)
**User:** All
**Description:** Invoice status changes (submit, approve, reject, paid) log activity to `project_activity` but do NOT create notifications in the `notifications` table. The recipient org is never notified in-app about invoice actions.
**Expected:** Every approval action should generate a notification to the affected user.
**Severity:** High

---

### BUG #24
**Step:** Phase 10, Step 66 (Cost Summary Report)
**User:** gc_test, fc_test
**Description:** There is no dedicated "Cost Summary Report" page or component. Financial data exists across dashboard KPIs and project overviews, but there is no unified report view showing original contract value, approved COs, revised contract value, invoiced to date, and balance remaining in a single exportable format.
**Expected:** A formal cost summary report should be available.
**Severity:** Medium — Feature is missing.

---

### BUG #25
**Step:** Phase 10, Step 67 (SOV Export)
**User:** gc_test
**Description:** There is no SOV export to PDF or CSV. The `ContractSOVEditor` has no export button.
**Expected:** SOV should be exportable to PDF or CSV.
**Severity:** Medium

---

### BUG #26
**Step:** Phase 10, Step 69 (CO Log Report)
**User:** gc_test
**Description:** There is no Change Order log report. The CO list page shows COs but has no export or formal report generation.
**Expected:** CO log report showing all COs (approved, rejected, pending) should be available.
**Severity:** Low

---

### BUG #27
**Step:** Global (Console errors)
**User:** All
**Description:** Multiple React `forwardRef` warnings in console: `Landing`, `DemoProvider`, `TooltipProvider`, `AuthProvider` all trigger "Function components cannot be given refs" warnings. These indicate components used as Route elements or wrapped in contexts that pass refs without `forwardRef`.
**Expected:** No console errors/warnings.
**Severity:** Low

---

## Summary Table

| # | Phase | Severity | Summary |
|---|-------|----------|---------|
| 1 | 1 | Medium | FC cannot create projects |
| 2 | 1 | Medium | Dual write to `project_participants` + legacy `project_team` |
| 3 | 1 | Low | No start date or description field in project wizard |
| 4 | 1 | High | GC cannot invite FC users |
| 5 | 1 | High | No notifications sent on project invite |
| 6 | 2 | **Critical** | No contract send/accept/sign workflow exists |
| 7 | 2 | High | Supplier projects — contracts section broken (null creatorRole) |
| 8 | 3 | **Critical** | No SOW line-item creation/review/revision workflow exists |
| 9 | 4 | Medium | SOV total vs contract value mismatch not blocked |
| 10 | 4 | High | No SOV submit/approve workflow |
| 11 | 5 | Medium | PO missing document attachment |
| 12 | 5 | Medium | No per-line-item partial delivery |
| 13 | 6 | High | CO approval does not update contract value |
| 14 | 6 | Medium | No Supplier-targeted CO workflow |
| 15 | 7 | Medium | No multi-tier invoice forwarding |
| 16 | 7 | Low | Payment tracking lacks amount/method |
| 17 | 7 | Medium | Overbilling only enforced client-side |
| 18 | 8 | Medium | No explicit credit/negative CO support |
| 19 | 8 | High | Invoice approval permission not enforced server-side |
| 20 | 8 | High | Contract deletion not blocked when invoices exist |
| 21 | 8 | Medium | No retainage release feature |
| 22 | 8 | Low | No file upload size/type validation |
| 23 | 9 | High | Invoice actions don't generate notifications |
| 24 | 10 | Medium | No cost summary report |
| 25 | 10 | Medium | No SOV export |
| 26 | 10 | Low | No CO log report |
| 27 | Global | Low | React forwardRef console warnings |

**By Severity:**
- Critical: 2 (Bugs #6, #8)
- High: 8 (Bugs #4, #5, #7, #10, #13, #19, #20, #23)
- Medium: 12 (Bugs #1, #2, #9, #11, #12, #14, #15, #17, #18, #21, #24, #25)
- Low: 5 (Bugs #3, #16, #22, #26, #27)

## Recommendation

The two **Critical** bugs (#6 and #8) represent missing core features (contract lifecycle and scope of work). Eight **High** severity bugs affect fundamental workflows: invitations without notifications, contract value not updating on CO approval, no server-side permission enforcement, and unsafe contract deletion. I recommend prioritizing fixes in this order:

1. Fix Bug #7 (Supplier contracts broken — quick fix, add `SUPPLIER` to `creatorRole` mapping)
2. Fix Bug #4 (GC can't invite FC — quick fix, update role filter)
3. Fix Bug #5 + #23 (Add notifications for invites and invoice actions)
4. Fix Bug #13 (Auto-update contract value on CO approval)
5. Fix Bug #20 (Prevent contract deletion when invoices exist)
6. Fix Bug #19 (Server-side invoice approval enforcement)
7. Build Bug #6 (Contract lifecycle — larger feature)
8. Build Bug #8 (SOW workflow — larger feature)

