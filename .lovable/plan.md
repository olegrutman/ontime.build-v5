

# Responsive UI Upgrade -- Project Pages

Design + layout changes only. No logic, permissions, database, or route changes.

## Scope

4 project areas: Overview, Work Orders, Purchase Orders, Invoices -- both list and detail views.

---

## 1. Project Overview (`src/pages/ProjectHome.tsx`)

**Current**: Two-zone grid `md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_340px]` -- already decent but needs minor mobile polish.

**Changes**:
- Add `min-w-0` to the grid container and both zone divs to prevent long text from expanding layout
- Ensure Zone B stacks cleanly below Zone A on xs/sm

**No other changes needed** -- MetricStrip, AttentionBanner, and financial sections are already responsive from prior rounds.

---

## 2. Work Orders Tab (`src/components/project/WorkOrdersTab.tsx`)

**Current**: Cards in `md:grid-cols-2 lg:grid-cols-3` grid. Status filter tabs are horizontally scrollable. Cards already display as stacked on mobile.

**Changes**:
- Add `min-w-0` to card title containers to prevent overflow
- Add `truncate` to work order title text to handle long names
- Ensure status filter tab row has proper negative margin bleed on mobile for edge-to-edge scrolling (already has `-mx-4 px-4`)

**No major restructuring needed** -- the existing card-based layout already functions as "RecordCards" with title, status, body fields, and tap-to-open behavior.

---

## 3. Purchase Orders

### 3a. PO List (`src/components/project/PurchaseOrdersTab.tsx`)

**Current**: Grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. POCard already shows title, status badge, supplier, items, pricing, and action buttons.

**Changes**:
- Add `min-w-0` to card content containers
- Header actions flex: add `flex-wrap` to prevent overflow on narrow screens when filter + create button are side by side

### 3b. PO Detail (`src/components/purchase-orders/PODetail.tsx`)

**Current**: Header has `flex items-center justify-between` with title left and action buttons right. Table has no horizontal scroll containment.

**Changes**:
- **Header**: Change to `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4` so title and actions stack on mobile
- **Action buttons**: Wrap in `flex flex-wrap gap-2` to allow wrapping on narrow screens
- **Info card grid**: Already `grid-cols-2 md:grid-cols-4` -- good
- **Line items table**: Wrap `<Table>` in `<div className="overflow-x-auto">` to contain horizontal scroll inside the card on mobile
- **Editing prices footer**: Add `sticky bottom-0 bg-card border-t p-4 z-10` on mobile for Save/Cancel to remain accessible
- **Pricing inputs**: On mobile, ensure input widths don't overflow (`w-full sm:w-24`)

---

## 4. Invoices

### 4a. Invoice List (`src/components/invoices/InvoicesTab.tsx`)

**Current**: Grid `sm:grid-cols-2 lg:grid-cols-3`. InvoiceCard already shows number, status, billing period, amount, and action buttons.

**Changes**:
- Header: Add `flex-wrap` for mobile wrapping of filter dropdown + create button
- Tab list (TC dual view): Add `max-w-full` and ensure it doesn't overflow on mobile

### 4b. Invoice Detail (`src/components/invoices/InvoiceDetail.tsx`)

**Current**: Header has `flex items-center justify-between` -- action buttons overflow on mobile. Table has 7 columns with no scroll containment.

**Changes**:
- **Header**: Change to `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4` so title/status stack above action buttons on mobile
- **Action buttons**: Wrap in `flex flex-wrap gap-2`
- **Line items table**: Wrap in `<div className="overflow-x-auto">` for contained horizontal scroll on mobile
- This is a wide table (7 columns) so horizontal scroll inside the card is the correct approach rather than converting to cards (preserves the SOV-style billing grid)

---

## 5. Work Order Detail (`src/components/change-order-detail/ChangeOrderDetailPage.tsx`)

**Current**: Two-zone grid `md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_380px]`. Already responsive from prior round.

**Changes**:
- Add `min-w-0` to both zone divs to prevent long text overflow
- Meta info row in the scope card: already `flex-wrap` -- good

---

## 6. Work Order Top Bar (`src/components/change-order-detail/WorkOrderTopBar.tsx`)

**Current**: Already has scrollable tabs, truncation, and responsive sizing.

**Changes**: None needed.

---

## 7. Project Top Bar (`src/components/project/ProjectTopBar.tsx`)

**Current**: Already has scrollable tabs, status dropdown, responsive spacing.

**Changes**: None needed.

---

## Summary of Files Modified

| File | Changes |
|------|---------|
| `src/pages/ProjectHome.tsx` | Add `min-w-0` to grid zones |
| `src/components/project/WorkOrdersTab.tsx` | Add `min-w-0` and `truncate` to title |
| `src/components/project/PurchaseOrdersTab.tsx` | Add `flex-wrap` to header actions, `min-w-0` to content |
| `src/components/purchase-orders/PODetail.tsx` | Stack header on mobile, wrap table in `overflow-x-auto`, sticky action bar for editing mode, responsive input widths |
| `src/components/invoices/InvoicesTab.tsx` | Add `flex-wrap` to header actions |
| `src/components/invoices/InvoiceDetail.tsx` | Stack header on mobile, wrap table in `overflow-x-auto`, `flex-wrap` on action buttons |
| `src/components/change-order-detail/ChangeOrderDetailPage.tsx` | Add `min-w-0` to zone divs |

## What Is NOT Changed
- No logic, permissions, database calls, or routes
- No component deletions or renames
- No new components (no separate "RecordCard" component -- existing cards already serve this purpose)
- Existing card-based lists already function as mobile-friendly record cards with title, status, body fields, and tap targets
- Tables that need many columns (Invoice SOV table, PO line items) use horizontal scroll containment rather than card conversion, preserving the tabular data integrity

