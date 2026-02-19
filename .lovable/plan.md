
# Full-Scale Demo Experience with Sasha as AI Guide

## Problem
The demo mode currently only renders a basic overview card (`DemoProjectOverview`). When users click into Work Orders, Purchase Orders, Invoices, or SOV tabs, those components fetch from the real database and show empty/error states. Sasha doesn't adapt to demo mode, and there's no way to showcase wizards (Work Order creation, PO creation, project setup).

## Solution
Replace the Bolt guide with Sasha as the primary demo guide, and build demo-aware versions of every major tab so potential clients can explore the full product without touching real data.

---

## Part 1: Sasha Demo Mode Awareness

**File: `src/components/sasha/SashaBubble.tsx`**
- Remove the auth gate (`if (!user)`) when `isDemoMode` is true so Sasha appears for unauthenticated demo users
- Pass demo context (role, project, current tab) into the Sasha edge function
- Show role-specific quick actions based on where the user is in the demo

**File: `src/hooks/useSashaContext.ts`**
- Detect demo mode from DemoContext
- Append demo role and project info to the context string sent to the edge function

**File: `supabase/functions/sasha-guide/index.ts`**
- Expand the system prompt with demo-specific instructions:
  - When the user is in demo mode, Sasha proactively guides them through capabilities
  - Role-specific conversation flows: explain what each tab does, suggest "Try creating a Work Order", "Let me show you how POs work"
  - Include knowledge about project setup wizard, Work Order wizard steps, PO wizard, invoicing from SOV, and material ordering
  - Sasha should suggest navigation actions (e.g., "Go to Work Orders tab") as clickable buttons that trigger tab changes

---

## Part 2: Demo-Aware Tabs

Each existing tab component fetches from Supabase. We need demo versions that render static data from `demoData.ts`.

### 2a. Demo Work Orders Tab
**New file: `src/components/demo/DemoWorkOrdersTab.tsx`**
- Renders `DEMO_WORK_ORDERS` for the current project as cards with status badges
- Clicking a WO card opens a demo detail panel showing title, description, status, pricing mode, labor/material totals
- Includes a "Create Work Order" button that opens the Work Order Wizard in demo mode (submits to nowhere, shows a success toast)

### 2b. Demo Purchase Orders Tab
**New file: `src/components/demo/DemoPurchaseOrdersTab.tsx`**
- Renders `DEMO_PURCHASE_ORDERS` for the current project
- Clicking a PO shows detail with line items (add `DemoPOLineItem` data to `demoData.ts`)
- Includes a "Create PO" button that opens a simplified demo PO flow
- Supplier role: shows pricing input fields (non-functional but visually complete)

### 2c. Demo Invoices Tab
**New file: `src/components/demo/DemoInvoicesTab.tsx`**
- Renders `DEMO_INVOICES` with status badges and amounts
- Clicking an invoice shows a detail view with billing period, line items from SOV
- GC role: shows approval actions
- TC role: shows "Create Invoice from SOV" button (opens a demo SOV picker)

### 2d. Demo SOV Tab
**New file: `src/components/demo/DemoSOVTab.tsx`**
- Renders `DEMO_SOV_ITEMS` in a table format with code, title, scheduled value, billed to date, retainage, and remaining columns
- Shows a progress bar for overall SOV completion
- Read-only in demo mode

### 2e. Demo RFIs Tab
**New file: `src/components/demo/DemoRFIsTab.tsx`**
- Add 2-3 demo RFI items to `demoData.ts`
- Shows RFI cards with priority, status, and assigned-to info

---

## Part 3: Expanded Demo Data

**File: `src/data/demoData.ts`**
Add the following to the existing dataset:
- `DemoPOLineItem[]` -- 3-5 line items per PO (description, qty, uom, unit_price)
- `DemoRFI[]` -- 2-3 RFIs per project with question, status, priority, responder
- `DemoInvoiceLineItem[]` -- SOV-linked line items per invoice showing percent complete and amount billed
- `DemoWorkOrderDetail` -- expanded WO data with location, work type, checklist items

---

## Part 4: Route Demo Tabs in ProjectHome

**File: `src/pages/ProjectHome.tsx`**
- When `isInDemoMode` is true, swap real tab components for demo versions:
  - `work-orders` tab renders `DemoWorkOrdersTab` instead of `WorkOrdersTab`
  - `purchase-orders` tab renders `DemoPurchaseOrdersTab` instead of `PurchaseOrdersTab`
  - `invoices` tab renders `DemoInvoicesTab` instead of `InvoicesTab`
  - `sov` tab renders `DemoSOVTab` instead of `ContractSOVEditor`
  - `rfis` tab renders `DemoRFIsTab` instead of `RFIsTab`

---

## Part 5: Demo Wizard Interactions

### 5a. Work Order Wizard in Demo Mode
**File: `src/components/work-order-wizard/WorkOrderWizard.tsx`**
- When demo mode is active, skip the Supabase-dependent `useProjectScope` call and use hardcoded demo scope data
- On submit: show success toast + add the new WO to demo state (no DB write)

### 5b. Sasha Navigation Actions
**File: `src/components/sasha/SashaBubble.tsx`**
- When Sasha returns action buttons like "Go to Work Orders", "Try creating a PO", or "View Invoices", clicking them triggers `navigate` or tab changes
- Add an `onNavigate` callback that the SashaBubble can use to switch tabs on the ProjectHome page via URL params

---

## Part 6: Bolt Guide Retirement (Optional)

**File: `src/App.tsx`**
- Hide BoltGuide when Sasha is active in demo mode (they serve the same purpose; Sasha is more dynamic)
- Keep Bolt code intact for future use but conditionally render based on a flag

---

## File Structure Summary

```text
New files:
  src/components/demo/DemoWorkOrdersTab.tsx
  src/components/demo/DemoPurchaseOrdersTab.tsx
  src/components/demo/DemoInvoicesTab.tsx
  src/components/demo/DemoSOVTab.tsx
  src/components/demo/DemoRFIsTab.tsx

Modified files:
  src/data/demoData.ts          -- add PO line items, RFIs, invoice lines, WO details
  src/pages/ProjectHome.tsx     -- swap real tabs for demo tabs when isDemoMode
  src/components/sasha/SashaBubble.tsx  -- show in demo mode, pass demo context, handle nav actions
  src/hooks/useSashaContext.ts  -- include demo role/project info
  supabase/functions/sasha-guide/index.ts  -- expanded system prompt for demo guidance
  src/components/demo/index.ts  -- export new components
```

## Implementation Sequence

1. Expand `demoData.ts` with PO line items, RFIs, invoice line items, WO details
2. Build the 5 demo tab components (WO, PO, Invoice, SOV, RFI)
3. Wire demo tabs into `ProjectHome.tsx`
4. Update Sasha to work in demo mode (bubble visibility, context, navigation actions)
5. Update edge function system prompt with full demo guidance knowledge
6. Hide Bolt guide during demo mode
7. Test all 4 role flows end-to-end

## Technical Notes

- All demo tab components consume static data from `demoData.ts` via `useDemoProjectData()` hook
- Wizard interactions in demo mode use `toast.success()` for feedback instead of DB writes
- Sasha navigation actions use `window.location` or `useNavigate` to change URL params
- No Supabase queries are made in any demo component
- The edge function prompt expansion adds approximately 200 lines of construction workflow knowledge so Sasha can explain every feature intelligently
