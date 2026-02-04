

# Plan: Replace Recent Activity with Purchase Order Summary Card

## Overview

Replace `ProjectActivitySection` with a new `POSummaryCard` in the "Needs Attention" section, giving users a quick snapshot of Purchase Order status within the project.

---

## New Component: `POSummaryCard`

### File: `src/components/project/POSummaryCard.tsx`

Create a new summary card following the same pattern as `WorkOrderSummaryCard` and `InvoiceSummaryCard`:

**Structure:**
```tsx
export function POSummaryCard({ projectId }: { projectId: string }) {
  // Fetches POs for this project
  // Calculates counts by status
  // Displays role-aware financial info
}
```

**Status Counts (3-column grid):**
| Column | Label | Meaning |
|--------|-------|---------|
| Awaiting | Amber | SUBMITTED (waiting on supplier pricing) |
| In Transit | Blue | ORDERED + READY_FOR_DELIVERY |
| Delivered | Green | DELIVERED |

**Role-Specific Financial Display:**

| Role | What They See |
|------|---------------|
| Supplier | "Purchase Orders Awaiting Pricing" count only (no totals) |
| Trade Contractor | Total PO spend, breakdown by status |
| General Contractor | Total PO cost |
| Field Crew | PO count only (they don't interact with POs financially) |

**Data Fetched:**
- All POs for this project (filtered by supplier if user is a supplier)
- Aggregate line_items totals where unit_price exists

---

## Update Project Index Export

### File: `src/components/project/index.ts`

Add export for new component:
```tsx
export { POSummaryCard } from './POSummaryCard';
```

---

## Update Project Overview Layout

### File: `src/pages/ProjectHome.tsx`

**Import Change:**
```tsx
// Remove:
import { ProjectActivitySection } from '@/components/project';

// Add:
import { POSummaryCard } from '@/components/project';
```

**Layout Change (Lines ~211-215):**

Current:
```tsx
<div className="grid gap-4 lg:grid-cols-3">
  <WorkOrderSummaryCard projectId={id!} />
  <InvoiceSummaryCard projectId={id!} />
  <ProjectActivitySection projectId={id!} />
</div>
```

Updated:
```tsx
<div className="grid gap-4 lg:grid-cols-3">
  <WorkOrderSummaryCard projectId={id!} />
  <InvoiceSummaryCard projectId={id!} />
  <POSummaryCard projectId={id!} />
</div>
```

---

## POSummaryCard Component Details

### Visual Layout

```text
┌─────────────────────────────────────────┐
│ 📦 Purchase Orders                      │
├─────────────────────────────────────────┤
│  [3]        [2]         [5]             │
│ Awaiting   In Transit  Delivered        │
├─────────────────────────────────────────┤
│ PO Spend          $12,450              │
│ Pending Pricing   $3,200               │
└─────────────────────────────────────────┘
```

### Icon
Uses `Package` from lucide-react (consistent with PO tab empty state)

### Status Mapping
```tsx
const awaiting = pos.filter(p => p.status === 'SUBMITTED').length;
const inTransit = pos.filter(p => ['ORDERED', 'READY_FOR_DELIVERY'].includes(p.status)).length;
const delivered = pos.filter(p => p.status === 'DELIVERED').length;
```

### Pricing Calculation
```tsx
// Sum line_total from po_line_items where priced
const totalSpend = lineItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/project/POSummaryCard.tsx` | **NEW** - Purchase Order summary card |
| `src/components/project/index.ts` | Add export for POSummaryCard |
| `src/pages/ProjectHome.tsx` | Replace ProjectActivitySection with POSummaryCard |

---

## Note: Activity Section Preserved

`ProjectActivitySection` is not deleted—it's just removed from the "Needs Attention" grid. It can be added elsewhere later (e.g., at the bottom of the overview or in a dedicated Activity tab).

