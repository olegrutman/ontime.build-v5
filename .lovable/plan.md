

# Clean Up: Delete All Work Order Feature Code

## Files to Delete

### Component directories (delete entirely)
| Directory | Files |
|---|---|
| `src/components/work-order-wizard/` | `WorkOrderWizard.tsx`, `WizardProgress.tsx`, `index.ts`, `steps/PathChoiceStep.tsx`, `steps/ScopeStep.tsx`, `steps/LocationStep.tsx`, `steps/AssignStep.tsx`, `steps/ReviewStep.tsx` |
| `src/components/work-order-tasks/` | `WorkOrderTaskList.tsx`, `WorkOrderTaskCard.tsx`, `AddTaskSheet.tsx`, `TaskQuickAdd.tsx`, `index.ts` |
| `src/components/field-capture-draft/` | `FieldCaptureDraftPage.tsx`, `index.ts` |
| `src/components/change-order-wizard/` | `index.ts` (already mostly empty) |

### Hooks to delete
| File | Used by |
|---|---|
| `src/hooks/useWorkOrderDraft.ts` | WorkOrdersTab, ChangeOrders, RFIsTab |
| `src/hooks/useWorkOrderTasks.ts` | FieldCaptureDraftPage, ChangeOrderDetailPage |
| `src/hooks/useWorkOrderLineItems.ts` | ChangeOrderDetailPage |
| `src/hooks/useWorkOrderLog.ts` | QuickLogView, FieldCaptureSheet |
| `src/hooks/useWorkOrderCatalog.ts` | ScopeStep, QuickLogView, FieldCaptureSheet, CatalogBrowser |
| `src/hooks/useFieldCapturesByWorkOrder.ts` | FieldCaptureDraftPage |

### Types to delete
| File |
|---|
| `src/types/workOrderWizard.ts` |
| `src/types/workOrderTask.ts` |

### Lib to delete
- `src/lib/computeWorkOrderTotal.ts` (used by WorkOrdersTab, WorkOrderSummaryCard)

## Files to Edit (remove WO imports and usage)

| File | What to remove |
|---|---|
| `src/App.tsx` | Remove `FieldCaptureDraftPage` lazy import + route; remove `ChangeOrderDetailPage` lazy import + route |
| `src/components/project/WorkOrdersTab.tsx` | **Gut entirely** — remove all WO wizard, field capture sheet, draft logic, WO list rendering. Leave as empty shell or delete if tab is removed |
| `src/components/project/WorkOrderSummaryCard.tsx` | Remove `enrichWorkOrderTotals` import and usage |
| `src/pages/ChangeOrders.tsx` | Remove `WorkOrderWizard`, `useWorkOrderDraft`, wizard data type imports and all creation logic |
| `src/components/rfi/RFIsTab.tsx` | Remove `WorkOrderWizard` import, `useWorkOrderDraft`, and WO-from-RFI creation logic |
| `src/components/change-order-detail/ChangeOrderDetailPage.tsx` | Remove `useWorkOrderTasks`, `useWorkOrderLineItems`, `WorkOrderLineItemsList`, `WorkOrderTaskList`, `AddTaskSheet`, `TaskQuickAdd` imports and all task/line-item rendering sections |
| `src/components/change-order-detail/WorkOrderLineItemsList.tsx` | **Delete** (only used by ChangeOrderDetailPage) |
| `src/components/field-capture/FieldCaptureSheet.tsx` | Remove `useWorkOrderCatalog`, `useWorkOrderLog`, `onCaptureComplete` prop and all related logic |
| `src/components/quick-log/QuickLogView.tsx` | Remove `useWorkOrderCatalog`, `useWorkOrderLog` imports and usage |
| `src/components/quick-log/CatalogBrowser.tsx` | Remove `useWorkOrderCatalog` type import |

## What Stays Untouched
- `src/components/field-capture/` core files (FieldCaptureCard, FieldCaptureList, CapturePhotoInput, CaptureVoiceInput, CaptureReasonChips) — these are reusable capture UI primitives
- `src/hooks/useFieldCaptures.ts` — base field capture hook, not WO-specific
- `src/components/change-order-detail/` pricing panels (TCPricingPanel, MaterialsPanel, etc.) — keep if you plan to reuse pricing UI
- Database tables (`change_order_projects`, `work_order_tasks`, `work_order_line_items`, `field_captures`) — no schema changes, just code cleanup
- `src/types/changeOrderProject.ts` — shared status/type definitions used broadly

## Result
Clean slate: no work order wizard, no task management, no draft flow, no line items UI. Field capture primitives remain as building blocks. You prompt the new concept from scratch.

