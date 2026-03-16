

# Bug Report: Old vs New Work Order Components Still Coexist

## Plain English Summary

The project was supposed to switch entirely to the new "Unified Work Order Wizard" but three places in the app still use the **old** wizard. This means users can create work orders through two completely different systems depending on where they click, leading to inconsistent data and a confusing experience.

---

## Where the Old Wizard Still Lives

### 1. The standalone "Work Orders" page (`/change-orders`)
**File:** `src/pages/ChangeOrders.tsx` (line 349)
This entire page still uses the **old** `WorkOrderWizard`. When a user navigates here via the sidebar and clicks "New Work Order", they get the legacy wizard with different fields (work type, scope details, location picker) that writes data using the old `createChangeOrder` function. This is a completely different flow from the unified wizard on the project tab.

**Who is affected:** All roles (GC, TC, FC) who use the sidebar navigation.

### 2. The RFI "Convert to Work Order" flow
**File:** `src/components/rfi/RFIsTab.tsx` (line 161)
When a user resolves an RFI and clicks "Convert to Work Order", it opens the **old** `WorkOrderWizard` pre-filled with RFI data. This bypass means RFI-originated work orders skip the new catalog-based scope selection, labor/materials/equipment steps, and financial summary.

**Who is affected:** GC and TC project managers who convert RFIs.

### 3. The Demo mode
**File:** `src/components/demo/DemoWorkOrdersTab.tsx` (line 9)
The demo/walkthrough experience still uses the old wizard, so potential customers see a different product than what real users get.

**Who is affected:** Sales demos and onboarding.

---

## What This Causes in Practice

| Scenario | What happens | Problem |
|----------|-------------|---------|
| TC creates WO from Project tab | Uses unified wizard with catalog, labor rates, materials, equipment | Correct |
| TC creates WO from sidebar "Work Orders" page | Uses old wizard with free-text scope, no catalog, no materials/equipment steps | Creates incomplete records — missing `wo_mode`, line items, materials |
| GC converts RFI to WO | Uses old wizard | Same incomplete data problem |
| FC creates WO from Project tab | Uses unified wizard | Correct |
| Any role views the standalone Work Orders list | Old card design, old status colors, no enriched totals | Inconsistent UI |

---

## Legacy Components That Should Be Removed

| Component/Folder | Still imported by | Action |
|---|---|---|
| `src/components/work-order-wizard/WorkOrderWizard.tsx` | ChangeOrders.tsx, RFIsTab.tsx, DemoWorkOrdersTab.tsx | Replace with UnifiedWOWizard |
| `src/components/work-order-wizard/WizardProgress.tsx` | ChangeOrderWizardDialog, EstimateUploadWizard, CreateRFIDialog, CreateReturnWizard | Keep (shared utility) |
| `src/components/work-order-wizard/steps/*` (TitleStep, ScopeDetailsStep, ReviewStep) | Only used by old WorkOrderWizard | Delete |
| `src/components/fc-work-order/FCWorkOrderDialog.tsx` | Nothing (already removed from imports) | Delete folder |
| `src/types/workOrderWizard.ts` | Old wizard steps, RFIsTab | Remove after migration |

---

## Recommended Fix Plan

### Step 1: Migrate `ChangeOrders.tsx` page
Replace the old `WorkOrderWizard` import with `UnifiedWOWizard`. Wire the `onComplete` handler the same way `WorkOrdersTab.tsx` does (save draft, insert line items, materials, equipment).

### Step 2: Migrate RFI conversion flow
Replace the old wizard in `RFIsTab.tsx` with `UnifiedWOWizard`. Pass the RFI description and scope as initial data to pre-fill the unified wizard's scope step.

### Step 3: Migrate Demo mode
Update `DemoWorkOrdersTab.tsx` to use the unified wizard (or a demo-specific version of it).

### Step 4: Delete dead code
- Delete `src/components/work-order-wizard/WorkOrderWizard.tsx`
- Delete `src/components/work-order-wizard/steps/` folder
- Delete `src/components/fc-work-order/` folder
- Delete `src/types/workOrderWizard.ts`
- Keep `WizardProgress.tsx` (used by other non-WO wizards)

### Step 5: Update barrel exports
Update `src/components/work-order-wizard/index.ts` to only export `WizardProgress`.

