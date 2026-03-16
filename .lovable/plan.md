

# Bug: Wizard tasks not showing on detail page

## Root Cause

The wizard writes selected catalog items to `work_order_line_items` table (lines 110-128 in WorkOrdersTab.tsx), but the detail page (`ChangeOrderDetailPage.tsx`) reads from `work_order_tasks` table via `useWorkOrderTasks` hook (line 218). These are two completely different tables with different schemas. Nothing bridges them.

## Fix

The detail page needs to display `work_order_line_items` instead of (or in addition to) `work_order_tasks`. Since the wizard now creates line items — not tasks — the detail page should show a **Line Items** section that reads from `work_order_line_items`.

### Changes

**1. Create `WorkOrderLineItemsList` component**
`src/components/change-order-detail/WorkOrderLineItemsList.tsx`

A read-only card that fetches `work_order_line_items` where `change_order_id` matches the current WO. Shows each item as a row with: item name, division/category, unit, location tag, and status badge. Styled like the existing `WorkOrderTaskList` card.

**2. Add `useWorkOrderLineItems` hook**
`src/hooks/useWorkOrderLineItems.ts`

Simple query hook: fetches `work_order_line_items` by `change_order_id`, ordered by `added_at`. Includes realtime subscription on the table filtered by `change_order_id`.

**3. Update `ChangeOrderDetailPage.tsx`**

- Import and render `WorkOrderLineItemsList` in the main content area, right after the scope card (line ~422), before or instead of the old `WorkOrderTaskList`.
- Keep `WorkOrderTaskList` for backwards compatibility with older WOs that used tasks, but only show it when `tasks.length > 0` and there are no line items. Or show both if both exist.

### What stays untouched
- The wizard code (it's writing correctly)
- `work_order_tasks` table and hooks (still used by legacy WOs)
- All approval/pricing/invoice flows

