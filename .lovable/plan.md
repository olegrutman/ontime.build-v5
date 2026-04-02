

# CO Feature Rebuild — Full Implementation Plan

This is a structured rewrite of the Change Order system. Every file listed below will be replaced entirely — not patched. The build follows the exact 11-step sequence specified.

---

## Phase 1: Schema Migrations

**New columns on `change_orders`:**
- `gc_budget` numeric nullable
- `co_material_responsible_override` text nullable
- `co_equipment_responsible_override` text nullable

**New columns on `co_labor_entries`:**
- `gc_approved` boolean default false
- `gc_approved_at` timestamptz nullable

**New columns on `change_order_collaborators`:**
- `accepted_at` timestamptz nullable
- `rejected_at` timestamptz nullable

**New table `co_sov_items`:**
- id uuid PK, co_id uuid FK, org_id uuid FK, line_item_name text, amount numeric, status text default 'pending', created_at timestamptz, approved_at timestamptz nullable, invoice_id uuid nullable
- RLS: authenticated users can read rows where org_id matches their org; platform staff and org members can write

---

## Phase 2: COAcceptBanner + Accept/Reject Flow

**New file:** `src/components/change-orders/COAcceptBanner.tsx`
- Reads `change_order_collaborators` for current user's org where status = 'invited'
- Shows banner: "[Org name] invited you to this CO"
- Accept button: updates collaborator status to 'active', sets `accepted_at`
- Decline button: updates to 'rejected', sets `rejected_at`, redirects to CO list
- Sends notification via `sendCONotification` on accept/reject

**Modification to wizard submit logic (Phase 3):** When GC creates CO with `assigned_to_org_id`, auto-insert a `change_order_collaborators` row with status 'invited'. Same when TC assigns FC.

---

## Phase 3: Unified COWizard Rewrite

**Files replaced:** `COWizard.tsx`, `StepConfig.tsx` (deleted), `StepCatalog.tsx` (deleted), `StepReview.tsx` (deleted), `QuickLogWizard.tsx` (deleted)

**New structure — 4 steps:**

| Step | Name | Content |
|------|------|---------|
| 1 | Why | Reason picker cards (same as QuickLogWizard's REASON_CARDS + full list). All roles see same UI. |
| 2 | Where | VisualLocationPicker component (already exists, unchanged). "Same as last time" shortcut. |
| 3 | How | **Role-specific content:** GC: pricing type, TC assignment dropdown, gc_budget input, material/equipment responsibility toggles. TC: pricing type, FC org selector, scope item picker (catalog browser). FC: scope item picker + quick-pick hour pills (2h/4h/8h/custom). |
| 4 | Team | All participants list with notification status. Confirm/Create button. |

- QuickLogWizard is consolidated — FC uses same wizard, just sees FC-specific How step
- Catalog browser logic from StepCatalog moves into the How step (stripped of location/reason sub-phases)
- Submit logic creates `change_order_collaborators` rows with status 'invited' for assigned orgs

---

## Phase 4: COTeamCard

**New file:** `src/components/change-orders/COTeamCard.tsx`
- Fetches orgs involved: CO creator org, assigned_to_org, collaborator orgs
- Each member shows: color-coded role avatar (GC=blue, TC=green, FC=amber), org name, role label, status pill (Owner/Active/Pending accept/Notified)
- Tap opens contact drawer (simple sheet with org info)

---

## Phase 5: COMaterialResponsibilityToggle + useCOResponsibility

**New hook:** `src/hooks/useCOResponsibility.ts`
- Priority: co_material_responsible_override → project_contracts.material_responsibility → default 'TC'
- Same for equipment
- Returns `{ materialResponsible, equipmentResponsible, isOverridden, setOverride }`

**New component:** `src/components/change-orders/COMaterialResponsibilityToggle.tsx`
- Inline toggle in materials/equipment panel headers
- Shows current responsibility with override indicator
- GC/TC can toggle; writes to `co_material_responsible_override` / `co_equipment_responsible_override`

---

## Phase 6: GC Approval Checkmarks + LaborEntryForm Rewrite

**COLineItemRow.tsx rewrite:**
- When CO is T&M or NTE and viewer is GC: each labor entry row shows a checkbox
- Checking sets `gc_approved = true`, `gc_approved_at = now()` on that entry
- TC sees approved vs pending status. FC sees own entry approval status only
- TC can log their own internal labor separately from FC pass-through

**LaborEntryForm.tsx rewrite:**
- **TC version:** Hourly mode: hours + rate + markup side by side with live total. Lump sum: amount + markup. Private actual cost section at bottom with margin calculation.
- **FC version:** Quick-pick hour pills (2h/4h/8h/10h/custom) lead. Fixed-price COs show lump sum. Private actual cost section at bottom with margin.
- Neither role enters the other's rate

---

## Phase 7: COProfitabilityCard

**New file:** `src/components/change-orders/COProfitabilityCard.tsx`
- TC view: revenue to GC - FC cost - own labor cost = margin ($, %)
- FC view: billed to TC - actual cost = margin ($, %)
- Hidden from GC
- Feeds from private actual cost entries in `co_labor_entries`

---

## Phase 8: COBudgetTracker

**New file:** `src/components/change-orders/COBudgetTracker.tsx`
- GC only
- Shows `gc_budget` vs total approved spend
- Progress bar with color thresholds (green < 80%, amber 80-95%, red > 95%)
- Separate from NTE — this is GC's internal target

---

## Phase 9: COSOVPanel

**New file:** `src/components/change-orders/COSOVPanel.tsx`
- Sidebar component
- One row per scope line item: name, dollar amount, status pill (Pending/Approved/Invoiced)
- Status driven by `co_sov_items` table
- TC can generate invoice for approved items
- GC sees invoice status
- FC sees their SOV lines only

---

## Phase 10: CODetailLayout Rewrite

**Full replacement of `CODetailLayout.tsx` assembling all new components:**

```text
+--------------------------------------------------+
| Top bar (sticky): CO#, title, status, back       |
+--------------------------------------------------+
| COAcceptBanner (if not accepted)                  |
| COWhosHere                                        |
+--------------------------------------------------+
| MAIN CONTENT (left)     | SIDEBAR (right, 300px) |
|                         |                         |
| COHeaderStrip           | COBudgetTracker (GC)    |
| COKPIStrip              | Financials card         |
| COHeroBlock             | COProfitabilityCard     |
| COTeamCard              | COSOVPanel              |
| Scope & Labor           | COStatusActions         |
| COMaterialsPanel        | FCInputRequestCard      |
| COEquipmentPanel        | FCPricingToggleCard     |
| Activity + comments     | CONTEPanel              |
+--------------------------------------------------+
```

Mobile: sidebar stacks below main content.

---

## Phase 11: COSidebar Rewrite

**Full replacement of `COSidebar.tsx`** to render sidebar components in the order above. Composed of the new components built in phases 7-9 plus existing ones.

---

## COKPIStrip Rewrite (included in Phase 10)

- **FC:** hours logged, billed to TC, actual cost (private), margin
- **TC:** FC cost, own billable, materials+equipment, total to GC
- **GC:** labor billed, materials, equipment, total to approve

## COHeroBlock Rewrite (included in Phase 10)

- Add FC accept/reject state handling
- Update card sets for new status combinations

---

## Files NOT touched (per spec)

useChangeOrders.ts, useChangeOrderDetail.ts, useCORoleContext.ts, coNotifications.ts, COActivityFeed.tsx, COWhosHere.tsx, VisualLocationPicker.tsx

---

## Summary

| Action | Files |
|--------|-------|
| Delete | StepConfig.tsx, StepCatalog.tsx, StepReview.tsx, QuickLogWizard.tsx |
| Full rewrite | COWizard.tsx, CODetailLayout.tsx, COSidebar.tsx, COHeroBlock.tsx, COKPIStrip.tsx, COLineItemRow.tsx, LaborEntryForm.tsx |
| New files | COAcceptBanner.tsx, COTeamCard.tsx, COSOVPanel.tsx, COBudgetTracker.tsx, COProfitabilityCard.tsx, COMaterialResponsibilityToggle.tsx, useCOResponsibility.ts |
| Migration | 1 migration with all schema additions |

This is a large rebuild. I will implement it in the exact sequence specified, ensuring each phase produces working UI before moving to the next.

