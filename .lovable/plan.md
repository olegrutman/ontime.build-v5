

# Consistent Design Across All Project Tabs

## Current Inconsistencies Found

After reviewing every tab and detail view, here are the specific problems organized by category:

### Font & Sizing Inconsistencies

| Component | Current Issue | Target |
|-----------|--------------|--------|
| Work Orders tab header | `text-lg` (18px) | `text-xl` (20px) to match POs tab |
| Work Orders status filter buttons | `text-xs` (12px) | `text-sm` (14px) |
| Work Order cards: meta tags | `text-xs` (12px), `py-0.5` (tiny badges) | `text-sm` (14px), proper padding |
| Invoice summary stat labels | `text-xs` (12px) | `text-sm` (14px) |
| SOV editor: item line numbers | `text-sm` (14px) but cramped | Increase row padding |
| SOV editor: lock/delete buttons | `h-8 w-8` (32px) | `h-10 w-10` (40px) |
| SOV editor: add input buttons | Default | `h-10` (40px) |
| PO Detail: info card labels | `text-xs` (12px) | `text-sm` (14px) |
| Invoice Detail: all table headers | Default small | `text-sm` minimum |
| Board item tags | `text-[10px]` (10px!) | `text-xs` (12px) minimum |
| Board item menu button | `h-6 w-6` (24px!) | `h-8 w-8` (32px) minimum |
| HoverActions buttons | `h-7 w-7` (28px) | `h-9 w-9` (36px) |
| Change Order Detail: metadata | `text-sm` mixed | Consistent `text-sm`/`text-base` |

### Touch Target Violations (below 40px)

| Component | Current | Target |
|-----------|---------|--------|
| `HoverActions` buttons | `h-7 w-7` (28px) | `h-9 w-9` (36px) |
| `BoardItem` menu button | `h-6 w-6` (24px) | `h-9 w-9` (36px) |
| `BoardColumn` add button | `h-7 w-7` (28px) | `h-9 w-9` (36px) |
| `ViewSwitcher` buttons | `h-8 w-8` (32px) | `h-9 w-9` (36px) |
| SOV lock/delete/edit buttons | `h-8 w-8` (32px) | `h-10 w-10` (40px) |
| SOV add item button | Default | `h-10` (40px) |
| Invoice quick-action buttons | `size="sm"` (36px) | No change needed |
| PO "Create PO" button | `size="sm"` (36px) | Default (40px) |
| Supplier Estimates add button | `h-6 w-6` (24px!) | `h-9 w-9` (36px) |
| Supplier Estimates delete button | `h-7 w-7` (28px) | `h-9 w-9` (36px) |

### Layout Pattern Inconsistencies

| Area | Current | Should Be |
|------|---------|-----------|
| Work Orders tab | Header inline, grid below | Match POs tab: header with stats subtitle |
| Work Orders cards | 3-column grid, no subtitle stats | Add subtitle with summary stats like POs |
| Invoice tab summary cards | 4-column mini-grid of colored boxes | Use same card style as financial summary |
| SOV editor | Full-width single column | Fine as-is (editing context) |
| Change Order detail | `lg:grid-cols-3` (2+1) | Align to project overview `lg:grid-cols-[1fr_360px]` |
| PO Detail | Single column, inline header | Add two-zone layout for sidebar info |
| Invoice Detail | Single column, inline header | Add two-zone layout for sidebar info |

### Interaction Pattern Inconsistencies

| Component | Issue |
|-----------|-------|
| Work Order cards | Use `HoverActions` (invisible until hover -- unusable on mobile) |
| Invoice cards | Use `HoverActions` (same hover-only problem) |
| PO cards | Use `HoverActions` (same hover-only problem) |
| Board items | `opacity-0 group-hover:opacity-100` menu button (invisible on mobile) |
| SOV editor edit buttons | `opacity-0 group-hover:opacity-100` (hidden on touch) |

## Implementation Plan

### Phase 1: Shared Component Updates (affects all tabs)

**1. `src/components/ui/hover-actions.tsx`**
- Increase button size from `h-7 w-7` to `h-9 w-9`
- Change default `alwaysVisible` behavior: on small screens, always show (use a media query approach via CSS: `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`)
- This single change improves touch accessibility across Work Orders, Invoices, POs, and Board items

**2. `src/components/ui/status-column.tsx`**
- Increase `sm` size from `h-6 px-2 text-xs min-w-[80px]` to `h-7 px-2.5 text-xs min-w-[80px]`
- Increase `md` size from `h-8 px-3 text-sm min-w-[100px]` to `h-9 px-3 text-sm min-w-[100px]`

**3. `src/components/ui/view-switcher.tsx`**
- Increase button size from `h-8 w-8` to `h-9 w-9`

**4. `src/components/board/BoardItem.tsx`**
- Increase menu button from `h-6 w-6` to `h-9 w-9`
- Always show menu button on mobile (remove `opacity-0 group-hover:opacity-100`, use responsive visibility)
- Increase tag text from `text-[10px]` to `text-xs` (12px)
- Increase tag padding from `px-1.5 py-0.5` to `px-2 py-1`

**5. `src/components/board/BoardColumn.tsx`**
- Increase add button from `h-7 w-7` to `h-9 w-9`

### Phase 2: Work Orders Tab

**6. `src/components/project/WorkOrdersTab.tsx`**
- Increase header from `text-lg` to `text-xl` (match POs tab)
- Add summary stats subtitle below the header (e.g., "12 work orders -- 3 draft, 2 pricing, 7 approved") matching the POs tab pattern
- Increase status filter buttons from `text-xs` to `text-sm`, increase size from `size="sm"` to default
- Increase card tag badges from `text-xs py-0.5` to `text-sm py-1`
- Increase card description from `text-sm` to `text-sm` (already fine, just ensure consistency)
- Remove hover-only HoverActions on work order cards; instead, make the entire card tappable (already done) and add a visible action button

### Phase 3: Invoices Tab

**7. `src/components/invoices/InvoicesTab.tsx`**
- Replace the 4-column summary stat boxes with a pattern closer to the new MetricStrip: use inline stat cells with proper labels at `text-sm` (currently `text-xs`)
- Increase "Pending Approval" and other stat labels from `text-xs` to `text-sm`
- Increase the role-context Alert text to `text-sm`

**8. `src/components/invoices/InvoiceCard.tsx`**
- Increase date and label text from `text-xs` to `text-sm`
- Increase card icon containers from `h-9 w-9` to `h-10 w-10`
- Make HoverActions always visible on mobile (handled by shared update in Phase 1)

**9. `src/components/invoices/InvoiceDetail.tsx`**
- Change layout to two-zone: main content (line items table, rejection notice) in left column; sidebar with summary card (invoice number, status, dates, total due) on the right
- Increase the "Back" button and action buttons to `h-10` minimum
- Increase info labels from `text-xs` to `text-sm`

### Phase 4: Purchase Orders Tab

**10. `src/components/project/PurchaseOrdersTab.tsx`**
- Increase "Create PO" button from `size="sm"` to default size
- Ensure the Select dropdown is at least `h-10` (40px)

**11. `src/components/purchase-orders/POCard.tsx`**
- Increase label text from `text-xs` to `text-sm`
- Increase icon containers from `h-9 w-9` to `h-10 w-10`
- Make HoverActions always visible on mobile (handled by shared update)

**12. `src/components/purchase-orders/PODetail.tsx`**
- Increase info card labels from `text-xs` to `text-sm`
- Increase the Back button to `h-10 w-10`
- Change layout to two-zone: main content (line items table, notes) left; sidebar card (supplier, status, dates, total) right
- Increase all action buttons to minimum `h-10`

### Phase 5: SOV Editor

**13. `src/components/sov/ContractSOVEditor.tsx`**
- Increase lock/delete/edit icon buttons from `h-8 w-8` to `h-10 w-10`
- Increase add item button to `h-10`
- Increase add item input to `h-10`
- Increase item row padding from `p-3` to `p-4`
- Make edit pencil icons always visible on mobile (responsive opacity)
- Increase percent display width from `w-16` to `w-20`
- Increase currency display width from `w-24` to `w-28`

### Phase 6: Change Order Detail Page

**14. `src/components/change-order-detail/ChangeOrderDetailPage.tsx`**
- Change sidebar layout from `lg:grid-cols-3` to `lg:grid-cols-[1fr_380px]` (matching project overview and dashboard)
- Increase "Back" button to `h-10`

**15. `src/components/change-order-detail/ChangeOrderHeader.tsx`**
- Increase metadata icons from `w-4 h-4` to `w-5 h-5`
- Increase metadata text from `text-sm` to `text-base` for better readability

### Phase 7: Supplier-Specific Components

**16. `src/components/project/SupplierEstimatesSection.tsx`**
- Increase add button from `h-6 w-6` to `h-9 w-9`
- Increase delete button from `h-7 w-7` to `h-9 w-9`
- Increase estimate name text from `text-sm` to `text-base`
- Increase "No estimates yet" message from `text-sm` to `text-base`

### Phase 8: Financial Summary Cards

**17. `src/components/project/ProjectFinancialsSectionNew.tsx`**
- Increase all `text-xs` labels to `text-sm`
- Increase inline edit save/cancel buttons from `h-7 px-2` to `h-9 px-3`
- Increase billing progress bar height from `h-2` to `h-3`

## What Stays the Same

- All data, logic, and functionality unchanged
- Color system and brand identity
- The two-zone layout pattern (already applied to Dashboard and Overview)
- Wizard experiences (already good)
- Dark sidebar navigation
- All dialog and modal designs
- All Supabase queries and state management

## Implementation Order

1. Shared components first (HoverActions, StatusColumn, ViewSwitcher, BoardItem, BoardColumn) -- biggest impact with fewest files
2. Work Orders tab (highest traffic tab for field workers)
3. Invoices tab + InvoiceDetail
4. Purchase Orders tab + PODetail
5. SOV Editor
6. Change Order Detail page
7. Supplier Estimates section
8. Financial Summary cards

## Key Design Rules Applied Throughout

- Body text minimum: 14px (`text-sm`)
- Labels minimum: 13px (`text-[13px]` or `text-sm`)
- Touch targets minimum: 36px (`h-9`), ideally 40px (`h-10`)
- Key numbers: 24px+ (`text-2xl`)
- Badges: 12px minimum (`text-xs`)
- All interactive elements visible on mobile (no hover-only UI)
- Consistent two-zone layout for detail views
- Consistent header pattern: title + subtitle stats + action buttons

