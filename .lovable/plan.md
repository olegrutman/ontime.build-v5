

# Fix: Location Not Updated on T&M Work Orders

## Root Cause

Two bugs prevent exterior ("outside") locations from being properly tracked and displayed:

### Bug 1: Database trigger ignores exterior location fields
The `update_co_checklist_location()` trigger only checks for `room_area` or `level` in `location_data`. But exterior locations use different keys: `exterior_level`, `exterior_feature_type`, `exterior_direction`. Result: `location_complete` stays `false` for all exterior work orders.

Current trigger logic:
```sql
(location_data->>'room_area') IS NOT NULL  -- only checks interior fields
OR (location_data->>'level') IS NOT NULL
```

The actual data stored:
```json
{"exterior_level": "Floor 2", "inside_outside": "outside", "exterior_feature_type": "Windows", "exterior_direction": "Right"}
```

### Bug 2: Header `formatLocation()` uses wrong field names
`ChangeOrderHeader.tsx` checks `location.level`, `location.room_area`, `location.exterior_feature` — but exterior data uses `exterior_level`, `exterior_feature_type`, `exterior_direction`. So the header only shows "Exterior" with no specifics.

---

## Plan

### 1. Fix the database trigger (new migration)

Update `update_co_checklist_location()` to also check exterior fields:
```sql
v_location_complete := (
  NEW.location_data IS NOT NULL 
  AND (
    -- Interior: room_area or level
    (NEW.location_data->>'room_area') IS NOT NULL AND ...
    OR (NEW.location_data->>'level') IS NOT NULL AND ...
    -- Exterior: exterior_level or exterior_feature_type
    OR (NEW.location_data->>'exterior_level') IS NOT NULL AND ...
    OR (NEW.location_data->>'exterior_feature_type') IS NOT NULL AND ...
  )
);
```

Also run a backfill UPDATE to fix existing work orders.

### 2. Fix `formatLocation()` in `ChangeOrderHeader.tsx`

Add support for `exterior_level`, `exterior_feature_type`, `exterior_direction`:
```ts
if (location.exterior_level) parts.push(location.exterior_level);
if (location.exterior_feature_type) parts.push(location.exterior_feature_type);
if (location.exterior_direction) parts.push(location.exterior_direction);
```

---

## Files to Edit
- New migration SQL — fix trigger + backfill existing data
- `src/components/change-order-detail/ChangeOrderHeader.tsx` — fix `formatLocation()`

