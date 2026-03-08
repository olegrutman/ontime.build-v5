

# Add PO Activity Timeline / Report

## What we're building
A collapsible "Activity Timeline" section on the PO Detail page showing step-by-step timestamps for each status transition — who did what and when. This uses the existing timestamp columns already on the `purchase_orders` table (`created_at`, `sent_at`/`sent_by`, `submitted_at`/`submitted_by`, `priced_at`/`priced_by`, `ordered_at`, `delivered_at`).

No database changes needed — all data already exists.

## Changes

### 1. New component: `src/components/purchase-orders/POActivityTimeline.tsx`
A vertical timeline component that renders each PO lifecycle step as a node:
- **Created** — `created_at`
- **Submitted to Supplier** — `submitted_at` / `submitted_by`
- **Priced by Supplier** — `priced_at` / `priced_by`
- **Ordered** — `ordered_at`
- **Delivered** — `delivered_at`

Each step shows: icon, label, formatted date+time, and "by [user]" when available. Completed steps get a green check; the current step is highlighted; future steps are grayed out. Uses a vertical line connecting the nodes (similar to the existing `StateProgressBar` pattern).

### 2. Update: `src/components/purchase-orders/PODetail.tsx`
Add a collapsible card (using `Collapsible` from radix) between the Info Card and the Line Items card:
```tsx
<POActivityTimeline po={po} />
```

This keeps the detail page clean — the timeline is collapsed by default and users expand it when they want the accountability report.

