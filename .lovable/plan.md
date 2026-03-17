

# Full Work Order Feature Cleanup — What's Still Left

The previous cleanup only removed the wizard, tasks, line items, and draft flow. The core WO infrastructure is still fully intact. Here's what still needs to be deleted.

## Files to Delete

### `src/components/change-order-detail/` (entire directory — 24 files)
All WO detail page components: `ChangeOrderDetailPage.tsx`, `WorkOrderTopBar.tsx`, `WorkOrderProgressBar.tsx`, `TCPricingPanel.tsx`, `TCPricingSummary.tsx`, `FieldCrewHoursPanel.tsx`, `EquipmentPanel.tsx`, `ApprovalPanel.tsx`, `TCApprovalPanel.tsx`, `ParticipantActivationPanel.tsx`, `GCLaborReviewPanel.tsx`, `ContractedPricingCard.tsx`, `MaterialResourceToggle.tsx`, `WorkOrderMaterialsPanel.tsx`, `MaterialsPanel.tsx`, `MaterialMarkupEditor.tsx`, `ChangeOrderChecklist.tsx`, `ChangeOrderStatusBadge.tsx`, `TMTimeCardsPanel.tsx`, `TimeCardForm.tsx`, `TCInternalCostEditor.tsx`, `LinkedPOCard.tsx`, `ActualCostPopup.tsx`, `index.ts`

### `src/components/work-item/` (entire directory)
`WorkItemPage.tsx`, `WorkItemHeader.tsx`, `WorkItemProgress.tsx`, `WorkItemDetails.tsx`, `WorkItemActions.tsx`, `index.ts`

### `src/components/project/` (WO-specific files)
- `WorkOrdersTab.tsx`
- `WorkOrdersBoard.tsx`
- `WorkOrderSummaryCard.tsx`

### `src/pages/ChangeOrders.tsx`
Standalone WO list page

### Hooks
- `src/hooks/useChangeOrderProject.ts` — main WO CRUD hook
- `src/hooks/useChangeOrderRealtime.ts` — realtime subscriptions for WO
- `src/hooks/useSOVReadiness.ts` — SOV readiness check used by WorkOrdersTab

### Types
- `src/types/changeOrderProject.ts` — WO status types, labels, etc.

## Files to Edit

### `src/App.tsx`
- Remove `ChangeOrderDetailPage` lazy import + route (`/change-order/:id`)
- Remove `WorkItemPage` lazy import + route (`/work-item/:id`)

### `src/pages/ProjectHome.tsx`
- Remove `WorkOrdersTab` import and usage (the "Work Orders" tab in project view)
- Remove `WorkOrderSummaryCard` import and usage from overview
- Remove the FeatureGate block wrapping the work orders tab

### `src/components/project/index.ts`
- Remove `WorkOrderSummaryCard` and `WorkOrdersTab` exports

### `src/hooks/useProjectFinancials.ts`
- Remove any remaining references to change order totals if present

### `src/hooks/useSashaContext.ts`
- Remove WO-related context strings for `/change-order/` and `/work-item/` routes

### `src/components/demo/DemoWorkOrdersTab.tsx` and demo references
- Delete `DemoWorkOrdersTab.tsx` and remove from `src/components/demo/index.ts`

## What Stays Untouched
- Field capture primitives (`src/components/field-capture/`)
- `src/hooks/useFieldCaptures.ts`
- Database tables (no schema changes)
- All other project tabs (POs, invoices, SOV, RFIs)

## Result
Complete removal of all Work Order UI. The "Work Orders" tab disappears from project view. The `/change-order/:id`, `/work-item/:id`, and `/change-orders` routes are gone. Clean slate for rebuild.

