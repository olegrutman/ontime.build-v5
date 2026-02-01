
# Plan: Fix Outside Location Not Registering as Complete

## Problem Analysis

When a work order is created with "Outside" location selected, two issues occur:

1. **Database checklist shows `location_complete: false`** even with valid outside location data
2. **Header displays "Exterior" but not the actual feature** (e.g., "Fascia")

### Root Cause

The database trigger `update_co_checklist_location` only checks for `room_area` or `level`:

```sql
-- Current (broken) logic
v_location_complete := (
  NEW.location_data IS NOT NULL 
  AND (
    (NEW.location_data->>'room_area') IS NOT NULL AND (NEW.location_data->>'room_area') != ''
    OR (NEW.location_data->>'level') IS NOT NULL AND (NEW.location_data->>'level') != ''
  )
);
```

It **does not check `exterior_feature`**, which is the field used for outside locations.

---

## Solution

### 1. Fix Database Trigger

Update the trigger to also check for `exterior_feature` when determining location completeness:

```sql
v_location_complete := (
  NEW.location_data IS NOT NULL 
  AND (
    -- Inside location: room_area or level
    (NEW.location_data->>'room_area') IS NOT NULL AND (NEW.location_data->>'room_area') != ''
    OR (NEW.location_data->>'level') IS NOT NULL AND (NEW.location_data->>'level') != ''
    -- Outside location: exterior_feature
    OR (NEW.location_data->>'exterior_feature') IS NOT NULL AND (NEW.location_data->>'exterior_feature') != ''
  )
);
```

### 2. Fix Header Display

Update `formatLocation` in `ChangeOrderHeader.tsx` to include the exterior feature:

```typescript
function formatLocation(location: LocationData): string {
  const parts: string[] = [];
  if (location.inside_outside) {
    parts.push(location.inside_outside === 'inside' ? 'Interior' : 'Exterior');
  }
  if (location.level) parts.push(location.level);
  if (location.unit) parts.push(`Unit ${location.unit}`);
  if (location.room_area) parts.push(location.room_area);
  // Add exterior feature for outside locations
  if (location.exterior_feature) {
    const formatted = location.exterior_feature
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    parts.push(formatted);
  }
  return parts.length > 0 ? parts.join(' • ') : 'No location specified';
}
```

### 3. Recalculate Existing Data

Run an update to fix existing work orders with outside locations:

```sql
UPDATE change_order_checklist cl
SET location_complete = (
  SELECT 
    cop.location_data IS NOT NULL 
    AND (
      (cop.location_data->>'room_area') IS NOT NULL AND (cop.location_data->>'room_area') != ''
      OR (cop.location_data->>'level') IS NOT NULL AND (cop.location_data->>'level') != ''
      OR (cop.location_data->>'exterior_feature') IS NOT NULL AND (cop.location_data->>'exterior_feature') != ''
    )
  FROM change_order_projects cop
  WHERE cop.id = cl.change_order_id
),
updated_at = now();
```

---

## Files to Modify

| File | Change |
|------|--------|
| Database Migration | Update `update_co_checklist_location` trigger to include `exterior_feature` |
| `src/components/change-order-detail/ChangeOrderHeader.tsx` | Update `formatLocation` to display exterior feature |

---

## Expected Results

After these changes:

- Work order "Fascia" will show `location_complete: true` in the checklist
- Header will display "Exterior • Fascia" instead of just "Exterior"
- All future outside work orders will properly register location as complete

---

## Testing Checklist

1. Verify existing "Fascia" work order now shows location complete
2. Create a new work order with Outside > Fascia selected
3. Confirm checklist shows location complete
4. Confirm header displays "Exterior • Fascia"
5. Test other exterior features (Siding, Soffit, etc.)
6. Verify inside locations still work correctly
