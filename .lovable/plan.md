
# CO Flow — Full QA Audit Report

---

## PHASE 1 — BUTTON AND ACTION AUDIT

### CRITICAL

**1. Notification deep links are broken**
- SCREEN: All CO notifications
- ELEMENT: Notification `action_url`
- PROBLEM: `coNotifications.ts` line 24 generates `/projects/{pid}/co/{coId}` but the actual route in `App.tsx` line 172 is `/projects/{pid}/change-orders/{coId}`. Every notification link leads to a 404 page.
- FIX: Change the URL template to `/projects/${payload.project_id}/change-orders/${payload.co_id}`

**2. Back button navigates to wrong URL**
- SCREEN: CO Detail Page
- ELEMENT: Back arrow button (line 214)
- PROBLEM: Navigates to `/project/${projectId}?tab=change-orders` (singular "project") but the app routes use `/projects/` (plural). This likely leads to 404 or wrong page.
- FIX: Change to `/projects/${projectId}?tab=change-orders` (or wherever the CO list actually lives — needs checking against the project home route)

**3. GC "Share" and "Send to WIP" both visible simultaneously**
- SCREEN: CO Detail (GC view, draft status, with assigned TC)
- ELEMENT: "Share with assigned party" + "Send to TC (Work in Progress)"
- PROBLEM: Both `canShare` and `canSendToWIP` can be true at the same time when GC is the creator, CO is draft, TC is assigned, and `draft_shared_with_next` is false. They do overlapping things — `Share` sets status to `shared`, `Send to WIP` sets status to `work_in_progress`. Per the spec, GC-created COs should go directly to WIP, not to `shared`.
- FIX: When `canSendToWIP` is true, suppress `canShare`. Or remove `canShare` for GC entirely and only keep the WIP path.

**4. `canSubmit` allows FC non-collaborator to submit on `work_in_progress` COs — MISSING**
- SCREEN: CO Detail (FC view)
- ELEMENT: "Submit for approval" button
- PROBLEM: `canSubmit` allows `status === 'draft' || 'shared' || 'closed_for_pricing'` but NOT `work_in_progress`. If FC created a CO and the status is `work_in_progress`, they cannot submit. Also FC collaborators are excluded by `!isCollaborator` — but FC collaborators should be able to submit their pricing independently when `closed_for_pricing`.
- FIX: For FC collaborators, add a separate `canSubmitFCPricing` condition: `isFC && isCollaborator && status === 'closed_for_pricing'`

**5. `doMarkCompleted` notifies wrong org**
- SCREEN: CO Detail (TC view, approved CO)
- ELEMENT: "Mark Work Completed" button
- PROBLEM: Notifies `co.assigned_to_org_id ?? co.org_id`. For GC-created COs, `assigned_to_org_id` IS the TC org, and `org_id` is GC. So it notifies TC (itself). Should notify GC (the CO creator/owner).
- FIX: Change to `notifyOrg(co.org_id, 'CO_COMPLETED')` since `org_id` is always the creating org (GC for Flow 1, TC for Flow 2 where there's no GC acknowledgment needed)

### HIGH

**6. `canApprove` requires `co.assigned_to_org_id === currentOrgId` for GC — wrong for GC-created COs**
- SCREEN: CO Detail (GC view, submitted status)
- ELEMENT: "Approve" button
- PROBLEM: For GC-created COs, `assigned_to_org_id` is the TC's org (GC assigned the CO to TC). So when the TC submits and it goes to GC for approval, `co.assigned_to_org_id === currentOrgId` is FALSE for GC because `assigned_to_org_id = TC's org`. GC cannot approve.
- FIX: GC approval should check `co.org_id === currentOrgId` (creating org) OR add a check for `isGC && status === 'submitted'` more broadly

**7. FC visibility leak — GC sees `laborTotal` which includes FC labor**
- SCREEN: CO Detail (GC view)
- ELEMENT: KPI strip "Labor" value + Financial sidebar
- PROBLEM: `financials.laborTotal = tcLaborTotal + fcLaborTotal`. GC sees this combined total. Per the spec, GC should only see TC's final price — never FC's numbers. The grand total shown to GC inadvertently includes FC's actual dollars.
- FIX: GC's displayed labor should be `tcLaborTotal` only (or `tc_submitted_price` when the toggle is ON). The `grandTotal` shown to GC needs to exclude FC labor and only include TC's pricing.

**8. FC can see "Amount" column in materials table**
- SCREEN: CO Detail (FC view), Materials panel
- ELEMENT: "Amount" column (line 707)
- PROBLEM: `{!isFC && <th>Amount</th>}` correctly hides the "Amount" header for FC, but checking the table body row at line 749: `{!isFC && <td>...</td>}` — this appears correct. However, the equipment panel footer totals (line 311) show `totalBilled` to GC when `equipmentResponsible` is NOT 'TC' — the condition `isGC || (isTC && equipmentResponsible === 'TC')` is correct for GC. OK, this seems fine.
- Actually reviewed — the `!isFC` column in materials DOES render the billed amount for FC if `isFC` is false. This is correct — FC is excluded. No issue here.

**9. Rejected CO — `canSubmit` in rejected panel doesn't include `work_in_progress`**
- SCREEN: CO Detail (rejected status, TC view)
- ELEMENT: "Resubmit" button in the rejection card (line 390-396)
- PROBLEM: The `canSubmit` condition (line 353) covers `draft | shared | closed_for_pricing` but NOT `rejected`. When a CO is rejected and the rejection panel renders, it shows a "Resubmit" button gated by `canSubmit` — but `rejected` status is not in the `canSubmit` condition. The button will never be enabled.
- FIX: Add `'rejected'` to `canSubmit`'s status list: `status === 'draft' || status === 'shared' || status === 'closed_for_pricing' || status === 'rejected'`

### MEDIUM

**10. Equipment draft form shows cost/markup fields to FC**
- SCREEN: CO Detail (FC view), Equipment panel
- ELEMENT: Cost $ and Markup % input fields in draft equipment rows (lines 257-279)
- PROBLEM: FC should not see equipment pricing. The draft form renders cost and markup inputs for all users. FC can enter pricing data they shouldn't see.
- FIX: Hide cost and markup fields when `isFC` is true. FC should only see description and duration.

**11. GC KPI strip shows "FC cost to TC" label when it shouldn't**
- SCREEN: CO Detail (GC view)
- ELEMENT: KPI strip (lines 259-263)
- PROBLEM: `isTC && financials.fcLaborTotal > 0` correctly gates this to TC only. Verified — not shown to GC. No issue.

**12. `co_number` shown twice in header**
- SCREEN: CO Detail
- ELEMENT: Header line 231
- PROBLEM: `displayTitle` already includes `co_number` (e.g. "CO-003 · Mar 20, 2026"), then line 231 shows `{co.co_number && <span>{co.co_number}</span>}` again below it. The CO number appears twice.
- FIX: Remove the duplicate `co.co_number` span on line 231.

**13. No invoice button anywhere on the CO detail page**
- SCREEN: CO Detail (approved + acknowledged status)
- ELEMENT: Status actions card
- PROBLEM: When CO is approved and acknowledged, `COStatusActions` shows a green "Approved & acknowledged — ready for invoicing" message but no button to actually create an invoice. The user must navigate to the Invoices tab separately. Per the spec, invoicing should be accessible from the CO.
- FIX: Add a "Create Invoice" button in the approved+acknowledged state that opens the `CreateInvoiceFromCOs` dialog pre-filtered to this CO.

### LOW

**14. `line_number` not auto-generated for materials**
- SCREEN: Materials panel, "Save" action
- ELEMENT: Material insert logic (line 392)
- PROBLEM: `line_number` is not set in the insert payload for draft rows. If the DB column is NOT NULL without a default, this will fail silently or error.
- FIX: Set `line_number: materials.length + idx + 1` for each saved row.

---

## PHASE 2 — SCENARIO TEST FINDINGS (Code Analysis)

### Scenario 1 — GC creates CO, FC input, hourly toggle
- **GC creates via wizard**: Works. Auto-generates CO number.
- **GC submits to WIP**: `canSendToWIP` works only if `isCreator`. OK.
- **GC adds scope items later**: Works via `AddScopeItemButton`. Notifications fire.
- **TC invites FC**: Works via `FCInputRequestCard`.
- **FC submits 12 hours**: Works via `LaborEntryForm`.
- **TC toggle ON**: FCPricingToggleCard calculates correctly now (after fix). Shows `fcHours * rate`.
- **GC closes for pricing**: Works — `canCloseForPricing` checks `isGC && work_in_progress`.
- **TC submits**: **BUG #9** — if status is `closed_for_pricing`, `canSubmit` works. But FC collaborator cannot submit independently — no `canSubmitFCPricing` for FC collaborators.
- **GC approves**: **BUG #6** — `canApprove` checks `assigned_to_org_id === currentOrgId` which is TC's org, not GC's. GC cannot approve.
- **GC can't see FC hours**: **BUG #7** — `laborTotal` includes FC labor, shown to GC in KPI.

### Scenario 2 — NTE tracking
- NTE percentage is computed from `grandTotal / nte_cap`. This includes materials + equipment + labor (TC+FC). The NTE tracking is based on the right total now.
- 80% warning notification fires from `LaborEntryForm` post-save. Works.
- 100% block: `nteBlocked` flag in `CODetailPage` blocks UI additions. Works at the UI level.
- **ISSUE**: `LaborEntryForm` has a "Log anyway" escape hatch at the NTE warning (line 374). The user CAN bypass the 95% warning and log anyway even at 100%. The hard block is only in the parent component hiding the "Add" button — but if the form is already open, the entry can still be saved.

### Scenario 3 — TC fixed-price, reject/revise
- TC creates CO: Works.
- TC submits: Works.
- GC rejects: Works — rejection note is saved.
- **BUG #9**: TC sees rejection card with "Resubmit" button, but `canSubmit` doesn't include `rejected` status. Button is gated by `canSubmit` which is false. TC cannot resubmit.
- GC approves after resubmit: **BUG #6** — GC can't approve (wrong `assigned_to_org_id` check).
- TC marks completed: Works — `canMarkCompleted` checks `isTC && isApproved && !co.completed_at`.
- GC acknowledges: Works — `canAcknowledge` checks `isGC && isApproved && co.completed_at && !co.completion_acknowledged_at`.
- TC invoices: No direct invoice button — must go to Invoices tab.

### Scenario 4 — Toggle OFF manual pricing
- FC submits lump sum: Works.
- TC sees FC total as cost reference: Works — `fcLaborTotal` shown in sidebar when `isTC`.
- TC enters own price manually: Works via labor form.
- **BUG #7**: GC sees `laborTotal = tcLaborTotal + fcLaborTotal` — not just TC's price.

### Scenario 5 — Materials/equipment responsibility
- Material visibility: `showPricingColumns` correctly checks `isFC ? false : isGC ? true : isTC && materialsResponsible === 'TC'`. This is correct per spec.
- Equipment visibility: Same pattern. Correct.
- FC adding equipment: FC can add (fixed in previous iteration). But **BUG #10** — FC sees cost/markup input fields in the draft form.

### Scenario 6 — Account toggle default
- `use_fc_input_as_base` is fetched from `org_settings` in `FCPricingToggleCard`. However, the CO wizard does NOT pre-set `use_fc_pricing_base` based on the account default when creating a new CO. The `COWizard.handleSubmit` doesn't set this field.
- **BUG**: New COs always have `use_fc_pricing_base = null/false` regardless of account setting. The account default toggle has no effect on new COs.

### Scenario 7 — Permission boundaries
- FC cannot see TC pricing in labor entries: `visibleBillable` filters to `fcBillable` when `isFC`. Correct.
- GC sees `laborTotal` which includes FC labor: **BUG #7**.
- FC cannot see material/equipment pricing: Correctly gated by `showPricingColumns`.

---

## PHASE 3 — STATUS MACHINE AUDIT

### Status transitions map

| From | Action | To | Trigger | Notification |
|------|--------|----|---------|-------------|
| (new) | Create | `draft` | COWizard submit | None |
| `draft` | GC Share | `shared` | `doShare()` | CO_SHARED to assigned org |
| `draft` | GC Send to WIP | `work_in_progress` | `doSubmitToWIP()` | CO_SHARED to assigned org |
| `work_in_progress` | GC Close | `closed_for_pricing` | `doCloseForPricing()` | CO_CLOSED_FOR_PRICING to all |
| `draft`/`shared`/`closed_for_pricing` | TC/FC Submit | `submitted` | `doSubmit()` | CHANGE_SUBMITTED to assigned org |
| `submitted` | GC Approve | `approved` | `doApprove()` | CHANGE_APPROVED to creating org |
| `submitted` | GC Reject | `rejected` | `doReject()` | CHANGE_REJECTED to creating org |
| `submitted` | TC/FC Recall | `draft` | `doRecall()` | CO_RECALLED to assigned org |
| `rejected` | TC Resubmit | `submitted` | `doSubmit()` | **BLOCKED** — `canSubmit` excludes `rejected` |
| `approved` | TC Mark complete | (flag only) | `doMarkCompleted()` | CO_COMPLETED |
| `approved` + completed | GC Acknowledge | (flag only) | `doAcknowledgeCompletion()` | CO_ACKNOWLEDGED |

### Issues found

1. **`rejected` is a dead end** — no exit path. `canSubmit` doesn't include `rejected`. TC cannot resubmit.
2. **`contracted` status exists in the DB and UI badge map but has NO trigger** — nothing ever sets a CO to `contracted`. Dead status.
3. **`shared` status** — GC-created COs skip `shared` (go to WIP), but TC-created COs go from `draft` → `shared` via `doShare()`. Then from `shared`, `canSubmit` picks it up. This works but there are TWO buttons (`Share` and `Submit`) visible in `shared` state for TC if `isCreator && !draft_shared_with_next` overlap with `canSubmit`.
4. **No transition from `approved` to `contracted`** — the "Contracted" message block renders at line 363-372 but nothing reaches it.
5. **Completion flow doesn't change status** — `doMarkCompleted` and `doAcknowledgeCompletion` only set timestamp flags, not a status change. The CO stays in `approved` status forever. This is by design per the plan, but the invoicing gate relies on `approved` + `completion_acknowledged_at`.

---

## PHASE 4 — DUPLICATE AND DEAD CODE

1. **`co_number` shown twice** in the CO detail header (in `displayTitle` and again as a separate span).
2. **`canShare` and `canSendToWIP` overlap** for GC on draft COs. Two buttons doing similar things.
3. **`contracted` status** — exists in badge maps, status labels, status order, but is never set. Dead code.
4. **`reason` and `reason_note` on `change_orders` table** — the wizard no longer sets these (reason is now per-item on `co_line_items`). The detail page still checks `co.reason` at line 490 and displays it. Dead field, always null for new COs.
5. **`StepReason.tsx`** — still exists in codebase but no longer imported by the wizard. Dead file.
6. **`combined` references** — `CO_STATUS_LABELS` and `ChangeOrder` interface may still reference `combined` from before the removal. Need to verify these are cleaned up.
7. **`line_total` column** — marked as DB-generated in memory but the `LaborEntryForm` doesn't set it. This works because the DB auto-calculates it, but `co_material_items` rely on DB triggers for `line_cost`, `markup_amount`, `billed_amount`. Need to verify those triggers exist.

---

## PRIORITIZED BUG LIST

### Critical (blocks flow entirely)
| # | Bug | Files |
|---|-----|-------|
| C1 | Notification URLs are broken (404) — `/co/` instead of `/change-orders/` | `coNotifications.ts` |
| C2 | `canApprove` blocks GC from approving GC-created COs | `COStatusActions.tsx` |
| C3 | `rejected` is a dead-end status — TC cannot resubmit | `COStatusActions.tsx` |
| C4 | GC back button navigates to wrong URL (`/project/` vs `/projects/`) | `CODetailPage.tsx` |

### Major (wrong behavior)
| # | Bug | Files |
|---|-----|-------|
| M1 | GC sees FC labor in `laborTotal` and `grandTotal` — violates visibility spec | `CODetailPage.tsx` |
| M2 | `doMarkCompleted` notifies wrong org (TC notifies itself instead of GC) | `COStatusActions.tsx` |
| M3 | Account-level `use_fc_input_as_base` default not applied to new COs | `COWizard.tsx` |
| M4 | FC collaborators can't submit pricing independently when `closed_for_pricing` | `COStatusActions.tsx` |
| M5 | `canShare` and `canSendToWIP` overlap — GC sees two conflicting buttons on draft | `COStatusActions.tsx` |
| M6 | Equipment draft form shows cost/markup fields to FC | `COEquipmentPanel.tsx` |
| M7 | NTE "Log anyway" escape hatch lets user bypass 100% hard block if form is already open | `LaborEntryForm.tsx` |

### Minor (cosmetic or confusing)
| # | Bug | Files |
|---|-----|-------|
| m1 | `co_number` displayed twice in header | `CODetailPage.tsx` |
| m2 | `contracted` status is dead — never triggered | Multiple files |
| m3 | `co.reason` still shown in sidebar Details but always null for new COs | `CODetailPage.tsx` |
| m4 | No "Create Invoice" button on the CO detail page when approved | `CODetailPage.tsx` |
| m5 | `line_number` not set when inserting material draft rows | `COMaterialsPanel.tsx` |
| m6 | `StepReason.tsx` is dead code | `wizard/StepReason.tsx` |

---

## ASSUMPTIONS MADE

1. The route for the project home page uses `/projects/:id` (plural) based on `App.tsx`. The back button uses `/project/` (singular) — assumed this is a typo/bug.
2. `contracted` status was part of the old combine flow and should be removed or repurposed.
3. For GC-created COs, `org_id` = GC's org and `assigned_to_org_id` = TC's org. The approval check should use `org_id` for GC identification.
4. FC collaborators should have a way to submit their pricing independently of TC — currently they have no submit action.
5. Material `line_number` relies on a DB default or trigger — if it doesn't, inserts may fail.

---

## SCENARIOS THAT PASS (no issues found in code analysis)

- FC adding materials with role correctly set to 'FC'
- FC adding equipment with role correctly set to 'FC' 
- Material/equipment pricing visibility rules (per `materialsResponsible` and `equipmentResponsible`)
- FCPricingToggleCard hourly/lump sum calculation formulas (after previous fix)
- NTE 80%/100% notification firing from `LaborEntryForm`
- NTE increase request/approve/reject workflow
- CO wizard scope item flow with per-item location and reason
- Activity feed logging for all status transitions
- Collaborator request and complete flow
