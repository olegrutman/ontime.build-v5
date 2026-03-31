

# Unified Recent Documents Card with Type Filters

## What Changes
The dashboard's "Recent Invoices" card becomes a **"Recent Documents"** card showing invoices, change orders, and purchase orders in one unified feed. Filter pills let users toggle between All / Invoices / Change Orders / POs. Items are sorted by most recent first, with attention-needing items (submitted, pending approval) surfaced prominently.

## Data Layer — `useDashboardData.ts`

### Expand `RecentDoc` type
- Change `type` from `'invoice'` to `'invoice' | 'change_order' | 'purchase_order'`

### Fetch change orders and POs alongside invoices
In the existing parallel query block (around line 414), add two more queries:
- `change_orders` table: `id, co_number, title, status, amount, created_at, project_id` for `projectIds`, ordered by `created_at desc`, limit 20
- `purchase_orders` table: `id, po_number, po_name, status, po_total, created_at, project_id` for `projectIds` where `organization_id = currentOrg.id`, ordered by `created_at desc`, limit 20

### Build unified list
After the existing invoice doc-building loop (line 474-502), add similar loops for COs and POs:
- COs: type `'change_order'`, title from `co_number` or `title`, status, amount
- POs: type `'purchase_order'`, title from `po_number` or `po_name`, status, amount from `po_total`

Sort all together by `created_at desc`, take top 15.

## UI — `DashboardRecentDocs.tsx`

### Add filter pills
Row of rounded-full pills below the header: `All` | `Invoices` | `Change Orders` | `POs`
- Active pill: `bg-primary text-primary-foreground`
- Inactive: `bg-muted/50 text-muted-foreground`
- Filter the displayed list by `doc.type`

### Update type labels and badge styles
Add entries for `change_order` and `purchase_order`:
- Change Order: amber badge
- Purchase Order: green badge

### Update click navigation
- Invoices → `/project/{id}/invoices`
- Change Orders → `/project/{id}/change-orders`
- Purchase Orders → `/project/{id}/purchase-orders` (or `/purchase-orders`)

### Attention indicator
Items with statuses like `SUBMITTED`, `PENDING_APPROVAL` get a subtle left amber border (3px) to visually flag items needing action.

## Files Modified
- `src/hooks/useDashboardData.ts` — expand queries and RecentDoc type
- `src/components/dashboard/DashboardRecentDocs.tsx` — add filter pills, new type labels, navigation routes
- `src/components/dashboard/DashboardActivityFeed.tsx` — already handles multiple types, no change needed

