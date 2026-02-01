
# Plan: Change "Draft" to "In Progress" on Work Order Pages

## Overview
Replace the "Draft" status label with "In Progress" throughout the work order interface to better reflect the state of work orders that are being actively worked on.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/types/changeOrderProject.ts` | Update `CHANGE_ORDER_STATUS_LABELS` to show "In Progress" for `draft` |
| `src/components/ui/status-column.tsx` | Update `CHANGE_ORDER_STATUS_OPTIONS` to show "In Progress" for `draft` |

---

## Implementation Details

### 1. Update `src/types/changeOrderProject.ts`

Change line 208 from:
```typescript
draft: 'Draft',
```
To:
```typescript
draft: 'In Progress',
```

### 2. Update `src/components/ui/status-column.tsx`

Change line 141 from:
```typescript
{ value: 'draft', label: 'Draft', color: '#C4C4C4' },
```
To:
```typescript
{ value: 'draft', label: 'In Progress', color: '#C4C4C4' },
```

---

## Visual Changes

**Before:**
- Work Order page header badge: "Draft"
- Board column header: "Draft"
- Status dropdown menu: "Draft"

**After:**
- Work Order page header badge: "In Progress"
- Board column header: "In Progress"
- Status dropdown menu: "In Progress"

---

## Affected Areas

This change will automatically update:
1. **Work Order Detail Page** - The `ChangeOrderStatusBadge` component (uses `CHANGE_ORDER_STATUS_LABELS`)
2. **Work Orders Board** - Column headers (uses `CHANGE_ORDER_STATUS_LABELS`)
3. **Status Dropdown Menus** - The `StatusColumn` component (uses `CHANGE_ORDER_STATUS_OPTIONS`)

---

## Testing Checklist

1. Navigate to a project's Work Orders tab
2. Verify the board column shows "In Progress" instead of "Draft"
3. Click on a draft work order
4. Verify the status badge shows "In Progress"
5. Check any status dropdown menus show "In Progress" option
