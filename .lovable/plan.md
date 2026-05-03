
# CO/WO Feature Audit — Findings from Code Review

I've completed a deep static analysis of the entire CO/WO system. Below are the bugs and risks I found, grouped by severity. Since I cannot spin up three simultaneous authenticated sessions in a browser, this audit is code-review based — but it covers every area in your test plan.

---

## CRITICAL — Visibility Leaks & Data Exposure

### 1. [ANY] [Part 2 - RLS] Internal costs (is_actual_cost) are readable by ALL CO participants at the DB level

**File:** `supabase/migrations/...738.sql` line 113

The `co_labor_entries` SELECT policy grants access to anyone whose org is `org_id` or `assigned_to_org_id` on the parent CO. This means:
- **GC can read FC's `is_actual_cost=true` entries** via direct Supabase query
- **TC can read FC's internal costs** via direct query
- The UI filters them out (line 141: `actualCosts.filter(e => e.is_actual_cost && e.entered_by_role === myRole)`), but this is **client-side only** — a savvy user with the anon key can bypass it

**Fix:** Add a column-level or row-level restriction. Either:
- Add `AND (NOT is_actual_cost OR org_id IN (SELECT ...))` to the SELECT policy
- Or create a view that strips `is_actual_cost` rows from other orgs

### 2. [GC] [Part 2 - RLS] GC can read ALL labor entry details (hours, rates) on fixed-price COs at DB level

The UI hides this (`hideGCBreakdown = isGC && pricingType === 'fixed'`, line 150), but the SELECT policy on `co_labor_entries` returns all rows. A GC user can query the table directly and see TC/FC hourly rates and hours — defeating the fixed-price privacy model.

### 3. [GC] [Part 2 - Materials] GC can read TC markup_percent on co_material_items at DB level

The `co_material_items` SELECT policy returns all columns including `markup_percent`, `markup_amount`. The UI may not display markup to GC, but the data is fully readable. Same issue for `co_equipment_items`.

### 4. [ANY] [Part 6 - RLS] Change order UPDATE policy only checks `org_id`, not `assigned_to_org_id`

**File:** migration line 66: `USING (org_id IN (SELECT organization_id FROM ...))`

The assigned TC/FC org **cannot update the CO** (e.g., submit, mark completed) because the UPDATE policy only allows the creating org. But `COStatusActions.tsx` calls `updateCO` as TC — this likely **silently fails** or is only saved because `submitCO`/`approveCO` use `.update()` which may return empty without error (using `.maybeSingle()`).

**Impact:** TC calling `doCloseForPricing`, `doRecall`, `doMarkCompleted`, `doAcknowledgeCompletion` — all of these call `.update()` on `change_orders` as the assigned org. They will be blocked by RLS.

**This is likely the most impactful bug in the system.** TCs cannot perform most status transitions.

---

## HIGH — Workflow Blockers

### 5. [TC/FC] [Part 3 - Recall] Recall does NOT clear `shared_at` or `draft_shared_with_next`

**File:** `COStatusActions.tsx` line 299-301

```typescript
updates: { status: 'draft', submitted_at: null }
```

After recall, the CO goes back to `draft` but `shared_at` and `draft_shared_with_next` remain truthy. This means the `canShare` check (line 356: `!co.draft_shared_with_next`) will block re-sharing, and the TC may retain visibility to a recalled draft.

### 6. [TC/FC] [Part 3 - Recall] Recall does NOT handle FC labor entries

When a CO with logged FC hours is recalled to draft, those entries remain. The test plan specifically asks: "What happens to the entries?" Answer: they persist silently. This isn't necessarily wrong, but there's no warning to the recalling user that hours exist.

### 7. [FC] [Part 1 - Accept] FC collaborators can't submit from 'draft' status

**File:** `COStatusActions.tsx` line 362-365

```typescript
const submitStatuses = isOwnerOrg
  ? ['draft', 'shared', 'work_in_progress', 'closed_for_pricing', 'rejected']
  : ['shared', 'work_in_progress', 'closed_for_pricing', 'rejected'];
```

If an FC is the CO owner (created the CO), they can submit from draft. But if they're the assigned org, they can only submit from 'shared' onwards. This is by design, but combined with bug #4 (RLS blocking assigned org updates), FC-as-creator flow may also fail at the DB level.

### 8. [ANY] [Part 9 - Notifications] NTE notifications don't exclude the actor

**File:** `LaborEntryForm.tsx` lines 193-199

When NTE threshold is crossed, notifications are sent to ALL members of `org_id` and `assigned_to_org_id` — including the user who just logged the hours. The actor should be excluded.

### 9. [ANY] [Part 9 - Notifications] `notifyOrg` sends to all org members including the acting user

**File:** `COStatusActions.tsx` lines 83-113

The `notifyOrg` function fetches all `user_org_roles` members and sends to each. It doesn't filter out `user.id` (the actor). While `notifyAllCOParties` excludes the actor's *org* (line 122: `orgIds.delete(currentOrgId)`), `notifyOrg` for single-org notifications (like `CO_SHARED`) will include the actor if they happen to be a member of the target org too.

### 10. [ANY] [Part 4 - NTE] NTE blocking is client-side only — no DB enforcement

The `nteBlocked` flag (useCORoleContext line 94) and the check in `LaborEntryForm.tsx` (line 137) are purely client-side. A user can bypass by calling `.insert()` on `co_labor_entries` directly. There's no DB trigger or check constraint preventing labor entries when NTE cap is exceeded.

---

## MEDIUM — UX Papercuts & Logic Issues

### 11. [TC] [Part 2 - KPI] KPI strip uses `financials.tcBillableToGC` which may show stale snapshot price

When `use_fc_pricing_base` is true and `tc_submitted_price` was set, the KPI strip shows the snapshot — not the live calculated value. If FC logs more hours after the snapshot was taken, the KPI is stale until TC re-submits.

### 12. [ANY] [Part 7 - Realtime] `useCORealtime` doesn't subscribe to `co_line_items` changes

**File:** `useCORealtime.ts`

The channel subscribes to `co_labor_entries`, `co_material_items`, `co_equipment_items`, `co_nte_log`, `change_orders`, and `co_activity` — but NOT `co_line_items`. When one user adds a line item (via the new V3 picker "Add Items" flow), the other user won't see it in realtime.

### 13. [ANY] [Part 7 - Realtime] No conflict detection on concurrent edits

Last-write-wins is acceptable per the test plan, but there's no optimistic locking or version check. Two users editing the same scope item description will silently overwrite each other.

### 14. [GC] [Part 1 - Approval] `doAcknowledgeCompletion` sets `completion_acknowledged_at` but doesn't transition to 'contracted'

**File:** `COStatusActions.tsx` lines 332-348

The function updates `completion_acknowledged_at` but doesn't set `status: 'contracted'`. The test plan expects: "Confirm it transitions to contracted and the 'ready to invoice' state appears." The status check at line 389 shows the approved+acknowledged state, but `contracted` status is never reached through this flow.

### 15. [ANY] [Part 8 - Wizard] Draft autosave relies on sessionStorage

Per memory `mem://features/project-setup/wizard-draft-persistence`, drafts use `sessionStorage`. This means:
- Closing the tab destroys the draft (sessionStorage is tab-scoped)
- The "resume-draft banner" won't appear after closing and reopening a new tab

### 16. [TC] [Part 5 - Materials] "Apply supplier pricing" clears the `supplierPriceMap` state immediately

**File:** `COMaterialsPanel.tsx` line 444: `setSupplierPriceMap(new Map())`

After applying pricing, the map is cleared. If the user navigates away and back, the "Supplier priced" badge logic depends on the PO status still being in `PRICED_STATUSES`, which should work. But the strikethrough visual is lost since the old prices are overwritten.

### 17. [ANY] [Part 3 - Status] No zero-scope-item guard on submit

The test plan asks: "Try to submit a CO with no assigned org. Should be blocked." The `doSubmit` function (line 188-193) checks for `assigned_to_org_id` but does NOT check if `lineItems.length === 0`. A CO with zero scope items can be submitted.

---

## LOW — Polish

### 18. [GC] [Part 2 - KPI] GC Budget tile shows "Click to edit" always, even on approved/contracted COs

The `EditableBudgetTile` doesn't check CO status before allowing edits.

### 19. [ANY] [Part 3 - Activity] Recall activity uses action string 'recalled' but activity feed rendering may not have a specific icon/label for it.

### 20. [FC] [Part 2 - KPI] FC KPI "Hours Logged" shows days as `Math.ceil(hours/8)` — not accounting for multi-worker scenarios where 16 hours could be 1 day with 2 workers.

---

## Summary of Fixes Needed (Priority Order)

1. **CRITICAL:** Fix `change_orders` UPDATE RLS policy to include `assigned_to_org_id` — TCs literally cannot perform status transitions
2. **CRITICAL:** Add RLS restriction on `co_labor_entries` SELECT to hide `is_actual_cost=true` rows from non-owning orgs
3. **CRITICAL:** Add RLS restriction or view to hide labor rate/hour details from GC on fixed-price COs
4. **CRITICAL:** Hide `markup_percent`/`markup_amount` columns from GC on material/equipment tables
5. **HIGH:** Fix recall to clear `shared_at` and `draft_shared_with_next`
6. **HIGH:** Exclude actor from NTE threshold notifications
7. **HIGH:** Add `co_line_items` to realtime subscription
8. **MEDIUM:** Add DB-level NTE enforcement trigger
9. **MEDIUM:** Implement `contracted` status transition on acknowledgment
10. **MEDIUM:** Add zero-scope guard on CO submit

Want me to proceed with implementing these fixes? I'd recommend starting with the CRITICAL RLS issues (#1-4) as they represent real security vulnerabilities.
