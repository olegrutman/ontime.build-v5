

# Plan: Fix Materials Priced Display in Ready for Approval Checklist

## Problem

When materials pricing is locked, the "Materials priced" checkbox in the "Ready for Approval" tile remains unchecked. Investigation shows:

- `materials_pricing_locked: true` on `change_order_projects` (set at 15:37)
- `materials_priced: false` in `change_order_checklist` (last updated at 14:55)

The database checklist update is failing silently because it's a secondary operation that doesn't throw on failure.

## Root Cause

The `lockMaterialsPricingMutation` in `useChangeOrderProject.ts` attempts to update the checklist table, but:
1. The update may be blocked by RLS policies
2. Supabase returns "success" with 0 rows affected when RLS blocks an update
3. The error handling only logs to console, doesn't retry or use alternative approaches

## Solution

Rather than relying solely on the database checklist table, update the `ChangeOrderChecklist` component to derive `materials_priced` status from the authoritative source: `changeOrder.materials_pricing_locked`.

This approach:
- Provides immediate UI feedback when materials are locked
- Works even if the database checklist update fails
- Uses the source of truth (the locked flag) rather than a derived copy

## Implementation

### File: `src/components/change-order-detail/ChangeOrderChecklist.tsx`

Add a prop to receive the change order's locked status and use it to override the checklist value for materials_priced.

**Current interface:**
```typescript
interface ChangeOrderChecklistProps {
  checklist: ChecklistType | null;
  requiresMaterials: boolean;
  requiresEquipment: boolean;
  hasFCParticipant: boolean;
}
```

**Updated interface:**
```typescript
interface ChangeOrderChecklistProps {
  checklist: ChecklistType | null;
  requiresMaterials: boolean;
  requiresEquipment: boolean;
  hasFCParticipant: boolean;
  materialsPricingLocked?: boolean;  // NEW: derive from changeOrder.materials_pricing_locked
}
```

**Updated logic:**
```typescript
// Derive materials_priced from the locked flag as source of truth
const effectiveMaterialsPriced = materialsPricingLocked || 
  (checklist?.materials_priced ?? false);

// Use effectiveMaterialsPriced when checking the materials_priced item
const isComplete = item.key === 'materials_priced'
  ? effectiveMaterialsPriced
  : (checklist && checklist[item.key as keyof ChecklistType]);
```

### File: `src/components/change-order-detail/ChangeOrderDetailPage.tsx`

Pass the new prop to `ChangeOrderChecklist`:

```typescript
<ChangeOrderChecklist
  checklist={checklist}
  requiresMaterials={changeOrder.requires_materials}
  requiresEquipment={changeOrder.requires_equipment}
  hasFCParticipant={hasFCParticipant}
  materialsPricingLocked={changeOrder.materials_pricing_locked}  // NEW
/>
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/change-order-detail/ChangeOrderChecklist.tsx` | Add `materialsPricingLocked` prop and derive `materials_priced` status from it |
| `src/components/change-order-detail/ChangeOrderDetailPage.tsx` | Pass `materials_pricing_locked` to `ChangeOrderChecklist` |

## Expected Result

After this change:
- When `materials_pricing_locked = true`, the "Materials priced" item shows as complete (green checkmark)
- Works immediately without relying on the database checklist update
- The checklist count updates correctly (e.g., "5 / 6" becomes "6 / 6")
- GC can finalize the work order

