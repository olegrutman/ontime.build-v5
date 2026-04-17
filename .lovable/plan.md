
## Audit: "Scheduled for Delivery" on Purchase Orders

### What's already built ✅
1. **DB column exists**: `purchase_orders.ready_for_delivery_at` (timestamptz) — already in schema and types.
2. **Status enum exists**: `READY_FOR_DELIVERY` is in the `po_status` enum and labeled "Ready for Delivery".
3. **Wizard collects a date**: `requested_delivery_date` is captured in the PO Wizard (HeaderScreen + ReviewScreen).
4. **Supplier dashboard reads it**: `useSupplierDashboardData` builds `upcomingDeliveries` and the 5-day strip from `ready_for_delivery_at`. The Scheduled Deliveries panel renders correctly when data is present.

### What's broken / missing ❌
1. **Wizard date is never persisted.** `requested_delivery_date` from the wizard is collected but **not written to any column** on `purchase_orders`. There is no `requested_delivery_date` column in the DB and no mapping to `ready_for_delivery_at`.
2. **No UI to set/edit `ready_for_delivery_at`.** Supplier action buttons in `PODetail.tsx` go straight `SUBMITTED/PRICED → ORDERED → DELIVERED`. The `READY_FOR_DELIVERY` status is **never set by any code path**.
3. **Confirmed by data**: All 10 most recent POs in DB have `ready_for_delivery_at = NULL` — explaining why the supplier's Scheduled Deliveries panel is empty.
4. **Action queue gap**: `useSupplierDashboardData` already flags "ORDERED but no delivery date" as an action item, but there is no destination UI to resolve it.

### Root cause
A scheduling date field was scaffolded end-to-end (DB column, status, dashboard reader, wizard input) but the **write path was never wired** — neither at PO creation nor as a post-order supplier action.

---

## Proposed fix (3 small additions)

### 1. Persist wizard delivery date at PO creation
In the PO creation handler (where the wizard payload becomes a `purchase_orders` insert), map `data.requested_delivery_date` → `ready_for_delivery_at` (ISO string). One-line change.

### 2. Add a "Schedule Delivery" supplier action on PODetail
For `status === 'ORDERED'` (supplier-side), add a button **"Schedule Delivery"** next to "Mark Delivered":
- Opens a small date picker dialog
- On save: `UPDATE purchase_orders SET ready_for_delivery_at = <date>, status = 'READY_FOR_DELIVERY'`
- After scheduling, a new "Mark Delivered" button on `READY_FOR_DELIVERY` completes the flow.

New status flow becomes:
```
SUBMITTED → PRICED → ORDERED → READY_FOR_DELIVERY → DELIVERED
                            ↘ (or skip directly) ↗
```

### 3. Show the scheduled date on PO detail header + table
- `PODetail.tsx` info card: add a "Scheduled Delivery" row showing `ready_for_delivery_at` (or "Not scheduled").
- `POTableView.tsx`: add an optional small "Delivery" column or include the date in the existing Date cell when present.

---

## Files modified
- `src/components/po-wizard-v2/usePOCreation.ts` (or wherever the wizard insert lives — locate it during implementation)
- `src/components/purchase-orders/PODetail.tsx` (add Schedule Delivery button + dialog + display row)
- `src/components/purchase-orders/POTableView.tsx` (display scheduled date)
- New: `src/components/purchase-orders/ScheduleDeliveryDialog.tsx` (small date-picker dialog)

## Files NOT touched
- DB schema (column already exists)
- `useSupplierDashboardData.ts` (already reads correctly)
- `SupplierDashboardView.tsx` / `SupplierDeliverySchedule.tsx` (already render correctly once data flows)
- RLS / permissions (existing PO update permissions cover this)

## Verification after implementation
- Create a PO with a delivery date in the wizard → confirm `ready_for_delivery_at` is set in DB.
- As supplier, on an ORDERED PO, click "Schedule Delivery" → set date → status becomes `READY_FOR_DELIVERY` and date persists.
- Supplier dashboard "Scheduled Deliveries" panel shows the PO; 5-day strip highlights the day.
- PO table shows the scheduled date.
