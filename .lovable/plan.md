

# What I Understood — In Plain English

## The Problem Today

Right now, the Work Orders page is cluttered with three separate things:

1. **A list of work orders** (the actual work orders)
2. **A "Field Captures" section** sitting above the work orders list — with its own "Capture" button, its own card list, and a separate sheet for taking photos/notes
3. **A "Quick Log" toggle** that switches the entire page to a different view for logging catalog items

Plus, the "New Work Order" button opens a 9-step wizard that asks for everything upfront — labor rates, materials, equipment pricing — before anyone else has even seen the work order. That's backwards. The person creating the work order shouldn't need to price it. They just need to say "here's the work, here's where it is, here's who needs to do it."

## What You Want Instead

**One clean page**: A list of work orders and a single "New Work Order" button. No separate field capture section. No Quick Log toggle. Just work orders.

**When you click "New Work Order"**, the first question is:

- **Field Capture** — Quick, mobile-first capture (photo, voice note, description, reason category). Same experience as the current FieldCaptureSheet, but now it's the first path inside the work order flow, not a separate feature floating on the page.

- **Full Work Order** — A simplified wizard that works like project setup:
  1. **Scope** — Pick items from the catalog + description
  2. **Location** — Pull from project setup data (buildings, levels, units, etc.)
  3. **Assign** — Pick who's involved (which TC, which FC, participants)
  4. **Review & Create** — Summary, then create

  **No labor pricing. No materials. No equipment.** Those get added later by the assigned parties — just like how project setup creates the project shell first and then everyone fills in their part.

**After creation**, the work order exists as a shell. The invited parties can open it and add their labor rates, materials, equipment, and other details. The work order detail page is where all that happens — not in the creation wizard.

## What Gets Removed / Changed

| Current Element | What Happens |
|---|---|
| `FieldCaptureList` on WorkOrdersTab | Remove from page. Field capture becomes a path inside "New Work Order" |
| `FieldCaptureSheet` standalone | Stays in BottomNav (mobile FAB) and DailyLogPanel. But on WorkOrdersTab it's absorbed into the wizard |
| `QuickLogView` toggle on WorkOrdersTab | Remove entirely. No more separate Quick Log mode on this page |
| Current wizard steps: Intent, Mode, Labor, Materials, Equipment | Remove from creation wizard. These happen later on the detail page |
| Current wizard steps: Scope, Location, Assign, Review | Keep, simplified |

## Files That Need to Change

| File | Action |
|---|---|
| `src/components/project/WorkOrdersTab.tsx` | Remove `FieldCaptureList`, remove `QuickLogView` toggle, simplify "New Work Order" to open new wizard |
| `src/components/work-order-wizard/WorkOrderWizard.tsx` | Rewrite: Step 1 = "Field Capture or Full WO?". Field Capture path reuses `FieldCaptureSheet` logic. Full WO path = Scope → Location → Assign → Review |
| `src/components/work-order-wizard/steps/` | Remove `IntentStep`, `CaptureModeStep`, `LaborStep`, `MaterialsStep`, `EquipmentStep`. Keep/simplify `ScopeStep`, `LocationStep`, `AssignStep`, `ReviewStep` |
| `src/components/work-order-wizard/FinancialSummaryBar.tsx` | Remove from wizard (no pricing at creation) |
| `src/components/work-order-wizard/EquipmentPicker.tsx` | Remove from wizard (moves to detail page later) |
| `src/types/workOrderWizard.ts` | Simplify — remove labor/materials/equipment fields from wizard data |
| `src/pages/ChangeOrders.tsx` | Update to match simplified wizard |
| `src/components/rfi/RFIsTab.tsx` | Update to match simplified wizard |

## What Stays Untouched

- `FieldCaptureSheet` in `BottomNav.tsx` (the mobile capture FAB)
- `FieldCaptureList` in `DailyLogPanel.tsx` (daily log still shows captures)
- `CatalogBrowser` component
- Work order detail page (`ChangeOrderDetailPage`)
- All approval/invoice/PO flows
- Database schema (no changes needed)

