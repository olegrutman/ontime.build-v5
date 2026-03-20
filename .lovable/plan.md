

# Remove CO Combining, Add CO-to-Invoice Billing

## Summary

Remove the "combine COs" workflow entirely. Instead, once COs are **approved**, downstream parties can select multiple approved COs and generate a single invoice with detailed line items pulled from each CO's labor, materials, and equipment data.

## What Gets Removed

### Frontend (delete/edit)
1. **Delete `src/components/change-orders/CombineDrawer.tsx`** — entire file
2. **Edit `src/components/change-orders/index.ts`** — remove `CombineDrawer` export
3. **Edit `src/components/change-orders/COListPage.tsx`**:
   - Remove `CombineDrawer` import and `<CombineDrawer>` usage
   - Remove `selectedIds` state, `combineOpen` state, `toggleSelect` function
   - Remove `selectableCOs`, `canCombine` variables
   - Remove checkbox selectable props from `CORow`/`COCard`
   - Remove "Combine" button from header
   - Remove `GitMerge` icon import (unless used elsewhere)
   - Remove `'combined'` from `STATUS_ORDER` and `STATUS_BADGE_STYLES`
   - Remove "Select drafts/shared to combine" hint text

4. **Edit `src/types/changeOrder.ts`**:
   - Remove `'combined'` from `COStatus` union
   - Remove `combined` from `CO_STATUS_LABELS`
   - Remove `combined_at`, `combined_co_id`, `parent_co_id` from `ChangeOrder` interface
   - Remove `COCombinedMember` interface

5. **Edit `src/hooks/useChangeOrders.ts`**:
   - Remove `COMemberPreview` interface and `memberPreviews` field from `ChangeOrderWithMembers`
   - Remove `combineCOs` mutation entirely
   - Remove `co_combined_members` query logic
   - Remove child-filtering logic (the `childIds` Set)
   - Remove `grouped.mine.combined` bucket

6. **Edit `src/hooks/useChangeOrderDetail.ts`**:
   - Remove `isCombinedParent` check and `memberCOs` query against `co_combined_members`
   - Remove `allCoIds` logic (always just `[coId]`)
   - Remove `memberCOs` from return value

7. **Edit `src/components/change-orders/CODetailPage.tsx`**:
   - Remove `memberCOs` usage, `scopeSections` combined logic
   - Remove `isCombinedParent` checks, `GitMerge` icon for combined
   - Remove `'combined'` from `STATUS_BADGE` and `isActiveStatus`
   - Simplify scope rendering to always show flat line items

8. **Edit `src/components/change-orders/COStatusActions.tsx`**:
   - Remove `isCombinedParent` check and combined-specific share logic

### Database Migration
- Remove `'combined'` from the `can_request_fc_change_order_input` function's status list
- Note: Keep `co_combined_members` table and `combined_co_id` column in DB for now (no destructive schema changes on existing data), but they'll be unused

## What Gets Added

### New: "Create Invoice from COs" Flow

**Concept**: On the Invoices tab, TC/FC users can click "New Invoice" and choose between SOV-based billing (existing) or CO-based billing (new). In CO-based mode, they select multiple approved COs and the system generates an invoice with precise line items.

#### Database Migration
- Add `co_ids` column (text array, nullable) to `invoices` table — stores the list of CO IDs that were billed in this invoice
- No new tables needed — invoice line items use the existing `invoice_line_items` table with detailed `description` text

#### New Component: `src/components/invoices/CreateInvoiceFromCOs.tsx`
A wizard/dialog with 3 steps:
1. **Select COs** — shows all `approved` COs on the project that haven't been billed yet (not in any existing invoice's `co_ids`). Multi-select with checkboxes. Each CO shows title, location, reason, grand total.
2. **Review Line Items** — auto-generated from selected COs:
   - **Labor entries**: `"[Item Name] – [Hours] hrs × $[Rate]/hr"` with amount `$[line_total]`
   - **Lump sum labor**: `"[Item Name] – Lump sum"` with amount
   - **Materials**: `"[Description] – [Qty] [UOM] × $[Unit Cost] + [Markup%] markup"` with `billed_amount`
   - **Equipment**: `"[Description] – [Duration Note]"` with `billed_amount`
   - User can edit descriptions before submitting
   - Shows subtotal, retainage, total
3. **Submit** — creates the invoice + line items, marks it as SUBMITTED

#### Edit: `src/components/invoices/InvoicesTab.tsx`
- Add a source picker when clicking "New Invoice": "From SOV" or "From Change Orders"
- When "From Change Orders" is selected, open the new `CreateInvoiceFromCOs` dialog

#### Edit: `src/components/invoices/InvoiceDetail.tsx`
- If invoice has `co_ids`, show a "Change Orders" section listing the linked COs with links to their detail pages

#### Edit: `src/types/invoice.ts`
- Add `co_ids: string[] | null` to `Invoice` interface

### Files Changed (total ~12)
- **Deleted**: `CombineDrawer.tsx`
- **New**: `CreateInvoiceFromCOs.tsx`
- **Edited**: `COListPage.tsx`, `CODetailPage.tsx`, `COStatusActions.tsx`, `useChangeOrders.ts`, `useChangeOrderDetail.ts`, `changeOrder.ts` (types), `change-orders/index.ts`, `InvoicesTab.tsx`, `InvoiceDetail.tsx`, `invoice.ts` (types)
- **Migration**: 1 SQL file (add `co_ids` column + RLS update)

