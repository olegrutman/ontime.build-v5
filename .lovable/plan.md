

# Fix: FC Contract Price Visibility & "Unknown" Creator on Work Order Tiles

## Issues Found

### 1. FC sees contract price they shouldn't
On the Work Orders list, when a work order is in "contracted" status, the `final_price` (TC-to-GC contract price) is displayed to all roles, including Field Crew. FC should only see their own earnings, not the contract price between TC and GC.

### 2. "Unknown" creator name
The profiles table has RLS policies that restrict profile visibility to users within the same organization. Since GC creates work orders but is in a different org than TC and FC, the profile lookup fails silently, and the fallback shows "Unknown". The `created_by_role` field (e.g., `GC_PM`) is already available in the data and can be used to show a meaningful label like "General Contractor" instead.

## Changes

### File: `src/components/project/WorkOrdersTab.tsx`

**Fix 1 - Hide contract price for FC:**
Wrap the contracted price display (lines 165-170) with a role check so FC users don't see it:
```typescript
{isContracted && changeOrder.final_price != null && !isFC && (
  <p className="text-sm font-medium mt-2 text-foreground">
    Contract: {formatCurrency(changeOrder.final_price)}
  </p>
)}
```

**Fix 2 - Show role-based fallback for creator:**
Update `getCreatorLabel` to use a role label map when the profile is not accessible:
```typescript
const ROLE_LABELS: Record<string, string> = {
  GC_PM: 'General Contractor',
  TC_PM: 'Trade Contractor',
  FC_PM: 'Field Crew',
  FS: 'Field Crew',
};

const getCreatorLabel = (co: any) => {
  if (co.created_by === user?.id) return 'You';
  const profile = co.creator_profile;
  if (profile?.first_name || profile?.last_name) {
    return [profile.first_name, profile.last_name].filter(Boolean).join(' ');
  }
  // Fallback to role label when profile is not accessible (cross-org RLS)
  if (co.created_by_role && ROLE_LABELS[co.created_by_role]) {
    return ROLE_LABELS[co.created_by_role];
  }
  return 'Unknown';
};
```

This also requires reading the `isFC` variable, which is already derivable from `currentRole` in the component. Will add:
```typescript
const isFC = currentRole === 'FC_PM' || currentRole === 'FS';
```

### Root Cause Note
The "Unknown" creator issue is caused by RLS on the `profiles` table, which only allows viewing profiles of users within the same organization. This is correct security behavior -- we just need a better fallback display.

### Files Modified
- `src/components/project/WorkOrdersTab.tsx` -- hide contract price for FC, show role label instead of "Unknown"
