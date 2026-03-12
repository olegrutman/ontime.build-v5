

# Redesign PO Tab to Match Invoices Tab Pattern

## What I Understood

You want the Purchase Orders tab to follow the same layout and UX patterns as the Invoices tab. Currently the PO tab is a flat grid with a status dropdown -- no directional tabs, no action bar metrics, no table view, no "Needs My Action" filter. The Invoices tab has all of these and is much more usable.

## What Changes

### 1. Directional Tabs (Sent vs Received)

Just like Invoices separates "Sent to GC" from "From Field Crews & Suppliers":

- **TC view**: "My POs" (POs the TC created) | "From GC" (POs where GC is pricing owner and TC can see)
- **GC view**: "My POs" (POs created by GC) | "From Trade Contractors" (POs created by TCs on the project)
- **Supplier view**: Single view -- POs sent to them (no tabs needed, same as today)
- **FC view**: Single view or hidden (FC typically doesn't interact with POs)

### 2. PO Action Bar (NEW -- mirrors InvoiceActionBar)

Three metric cards across the top:

| Needs Your Action | Awaiting Delivery | Delivered This Month |
|---|---|---|
| 2 ($4,500) | 1 ($21,250) | $13,800 |

- **Needs Your Action**: For TC/GC = ACTIVE (draft) POs. For Supplier = SUBMITTED (needs pricing).
- **Awaiting Delivery**: ORDERED status POs.
- **Delivered This Month**: DELIVERED POs delivered in current month, with total spend.

### 3. View Switcher (Table + Card)

Add the same `ViewSwitcher` component with table and list (card) modes. Create a `POTableView` component similar to `InvoiceTableView` with sortable columns: PO Number, Supplier, Items, Status, Total, Date, Age.

### 4. "Needs My Action" Filter

Add a "Needs My Action" option to the status filter dropdown, just like invoices. For TC/GC this filters to ACTIVE POs. For Supplier, it filters to SUBMITTED POs.

### 5. Role Context Messages

Add contextual helper text like invoices does -- different empty states and descriptions per role.

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/components/purchase-orders/POActionBar.tsx` | **NEW** -- 3 metric cards (mirrors InvoiceActionBar) |
| `src/components/purchase-orders/POTableView.tsx` | **NEW** -- Sortable table view (mirrors InvoiceTableView) |
| `src/components/project/PurchaseOrdersTab.tsx` | Redesign: add directional tabs, action bar, view switcher, "Needs My Action" filter, role context |

## What Stays the Same

- `POCard` component (used in card/list view mode)
- `PODetail` component (detail view on click)
- `POWizardV2` (create/edit wizards)
- All data fetching and CRUD logic
- Supplier filtering (only sees their own POs, excludes ACTIVE)

