
# Work Orders Tab: Sort, Separate T&M, Show Creator, Contract Price, Progress Stage

## Changes Overview

### 1. Sort by urgency (most attention first)
Priority order:
1. `rejected` -- needs immediate re-work
2. `fc_input` -- waiting on Field Crew
3. `tc_pricing` -- waiting on Trade Contractor pricing
4. `ready_for_approval` -- needs GC decision
5. `draft` -- in progress, still being built
6. `approved` -- done, pending contract conversion
7. `contracted` -- complete

Within same status, sort by `created_at` descending (newest first).

### 2. Separate T&M and Fixed Price work orders
Split the list into two sections with headings:
- **"Fixed Price"** section (work orders where `pricing_mode !== 'tm'`)
- **"Time & Material"** section (work orders where `pricing_mode === 'tm'`)

Each section gets its own heading. If either section is empty, it is hidden.

### 3. Show who created each work order
Update the data fetch in `useChangeOrderProject.ts` to join the `profiles` table on `created_by`:
```sql
profiles!created_by(first_name, last_name)
```
Display on each card: "Created by [Name]" with a subtle indicator if you are the creator ("You") vs someone else's name.

### 4. Show contract price if contracted
When a work order's status is `contracted`, display the `final_price` on the card as "Contract: $X,XXX".

### 5. Remove board/grid view option
Remove the `ViewSwitcher` component from the Work Orders tab entirely. Only list view remains.

### 6. Unify terminology: "In Progress" consistently
The status labels already map `draft` to "In Progress" in `CHANGE_ORDER_STATUS_LABELS` and `CHANGE_ORDER_STATUS_OPTIONS`. Update the status filter tabs to use the same labels from `CHANGE_ORDER_STATUS_LABELS` instead of a separate `getStatusLabel` function. This ensures "In Progress" is used everywhere instead of "Draft".

### 7. Show current progress stage on the card
For "In Progress" (draft) work orders, show a small inline indicator of where in the workflow the work order currently sits. Use the checklist data or a simple text like the next pending action. For non-draft statuses, the status badge already indicates the stage. Add a brief sub-label showing the current step (e.g., "Field Crew Input", "Trade Contractor Pricing") directly on the tile.

### 8. Update WorkOrderTopBar with same terminology
The `WorkOrderTopBar` already uses `ChangeOrderStatusBadge` which reads from `CHANGE_ORDER_STATUS_LABELS` -- so "draft" already shows as "In Progress". The progress bar `SHORT_LABELS` also maps draft to "In Progress". No changes needed here as they already use the centralized labels.

---

## Technical Details

### File: `src/hooks/useChangeOrderProject.ts`
- In the `useChangeOrderProject` query (lines 50-75), add join: `profiles!created_by(first_name, last_name)` to the select clause
- Update the `ChangeOrderProject` type usage to include creator profile data

### File: `src/types/changeOrderProject.ts`
- Add optional `creator_profile` to `ChangeOrderProject` interface:
  ```typescript
  creator_profile?: { first_name: string | null; last_name: string | null } | null;
  ```

### File: `src/components/project/WorkOrdersTab.tsx`

**Remove board view:**
- Remove `ViewSwitcher` import and component
- Remove `viewMode` state
- Remove `WorkOrdersBoard` import and conditional rendering
- Remove "only show in list view" conditional on status tabs

**Sort by urgency:**
```typescript
const STATUS_PRIORITY: Record<ChangeOrderStatus, number> = {
  rejected: 0,
  fc_input: 1,
  tc_pricing: 2,
  ready_for_approval: 3,
  draft: 4,
  approved: 5,
  contracted: 6,
};

const sortedOrders = [...filteredChangeOrders].sort((a, b) => {
  const pa = STATUS_PRIORITY[a.status] ?? 99;
  const pb = STATUS_PRIORITY[b.status] ?? 99;
  if (pa !== pb) return pa - pb;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
});
```

**Separate T&M vs Fixed:**
```typescript
const fixedOrders = sortedOrders.filter(co => (co as any).pricing_mode !== 'tm');
const tmOrders = sortedOrders.filter(co => (co as any).pricing_mode === 'tm');
```
Render with section headings "Fixed Price" and "Time & Material".

**Use centralized labels for filter tabs:**
Replace `getStatusLabel()` with `CHANGE_ORDER_STATUS_LABELS` so "draft" shows as "In Progress".

**Show creator on card:**
Display "Created by You" or "Created by [First Last]" by comparing `created_by` against the current `user.id`.

**Show contract price:**
When `status === 'contracted'` and `final_price` exists, show formatted currency on the card.

**Show progress stage on card:**
For non-draft statuses, display the `CHANGE_ORDER_STATUS_LABELS[status]` as a small text below the status badge so users see exactly where the work order is in the workflow.

### Files Modified
- `src/types/changeOrderProject.ts` -- add `creator_profile` field
- `src/hooks/useChangeOrderProject.ts` -- join profiles table
- `src/components/project/WorkOrdersTab.tsx` -- sorting, sections, creator, contract price, remove board view, unified terminology
