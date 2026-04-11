

# WO-to-Invoice Flow for T&M Projects

## What needs to happen
In T&M projects, there's no SOV — invoices are created from approved Work Orders (WOs). The existing `CreateInvoiceFromCOs` component already does this, but it's not wired up as the primary invoice creation path for T&M projects, and it still uses "Change Order" language.

## Changes

### 1. `src/components/invoices/InvoicesTab.tsx`
- Accept `isTM` prop (passed from `ProjectHome.tsx`)
- When `isTM` is true:
  - Skip SOV readiness check entirely (no SOV in T&M)
  - "New Invoice" button opens `CreateInvoiceFromCOs` instead of `CreateInvoiceFromSOV`
  - Hide the SOV alert banner
  - Pass `isTM` to `CreateInvoiceFromCOs`

### 2. `src/pages/ProjectHome.tsx`
- Pass `isTM` prop to `<InvoicesTab>`

### 3. `src/components/invoices/CreateInvoiceFromCOs.tsx`
- Accept `isTM` prop
- Swap all "Change Order" / "CO" text to "Work Order" / "WO" when `isTM`:
  - Dialog title: "Select Work Orders" / "Review Invoice Line Items"
  - Empty state: "No unbilled approved work orders available"
  - List item fallback: "Untitled WO" instead of "Untitled CO"
  - Toast: "Invoice created from work orders"
  - Notes field: "Invoice from N work order(s)"
  - Invoice number prefix: `WO-INV-` instead of `CO-INV-`

### 4. No database changes needed
The existing `invoices` table already has `co_ids` to link invoices to change orders/work orders. The flow is identical — just the entry point and labels differ.

## Technical detail
- `CreateInvoiceFromCOs` already filters approved COs by org role (TC sees assigned COs, FC sees own COs) and checks for already-billed COs — this logic works identically for WOs
- The `createDialogOpen` state in `InvoicesTab` will conditionally open either `CreateInvoiceFromSOV` (fixed) or `CreateInvoiceFromCOs` (T&M)

