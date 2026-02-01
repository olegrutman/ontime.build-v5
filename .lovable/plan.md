
# Plan: Fix SOV Warning Not Updating After Locking SOVs

## Problem Analysis

The SOV warning on the Work Orders tab doesn't disappear after SOVs are locked because the `useSOVReadiness` hook only fetches data once on mount. When the user:
1. Views Work Orders tab → sees warning (SOVs not locked)
2. Goes to SOV tab → locks SOVs
3. Returns to Work Orders tab → warning still shows (stale data)

The hook doesn't re-fetch data when the user navigates between tabs or when SOVs are updated.

---

## Root Cause

In `useSOVReadiness.ts`:
```typescript
useEffect(() => {
  fetchData();
}, [fetchData]);
```

This only runs once when the hook mounts. There's no mechanism to:
- Refetch when the tab becomes active
- Listen for database changes
- Invalidate stale data

---

## Solution

Add a **refetch trigger** that runs when the user navigates to the Work Orders tab, and expose it to allow manual refetching.

### Option A: Add Refetch on Visibility (Recommended)

Add a `refetch` function that can be called externally, and auto-refetch when the hook is re-mounted (which happens when switching tabs in this SPA pattern).

### Implementation

1. **Expose a `refetch` function** from `useSOVReadiness`
2. **Add `key` prop pattern** to force re-mount when tab changes, OR
3. **Use tab change as dependency** to trigger refetch

The cleanest approach is to expose `refetch` and call it when the Work Orders tab becomes active.

---

## File Changes

| File | Change |
|------|--------|
| `src/hooks/useSOVReadiness.ts` | Export `refetch` function from the hook |
| `src/components/project/WorkOrdersTab.tsx` | Call refetch on mount to ensure fresh data |

---

## Implementation Details

### Update useSOVReadiness.ts

```typescript
export function useSOVReadiness(projectId: string | undefined): SOVReadiness & { refetch: () => void } {
  // ... existing state ...

  const fetchData = useCallback(async () => {
    // ... existing fetch logic ...
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ... existing readiness computation ...

  return {
    ...readiness,
    refetch: fetchData  // Expose refetch function
  };
}
```

### Update WorkOrdersTab.tsx

```typescript
const sovReadiness = useSOVReadiness(projectId);

// Refetch SOV status on mount to ensure fresh data
useEffect(() => {
  sovReadiness.refetch();
}, []); // Only on mount
```

This ensures that every time the user navigates to the Work Orders tab, the SOV readiness check runs fresh.

---

## Alternative: Add Interval Polling

If real-time updates are desired without navigation, we could add polling:

```typescript
useEffect(() => {
  fetchData();
  const interval = setInterval(fetchData, 30000); // Poll every 30s
  return () => clearInterval(interval);
}, [fetchData]);
```

However, this adds unnecessary network traffic. The refetch-on-mount approach is cleaner.

---

## Expected Results

After implementation:
1. User views Work Orders tab → sees SOV warning
2. User goes to SOV tab → locks all SOVs
3. User returns to Work Orders tab → **warning disappears** (fresh fetch on mount)
4. New Work Order button becomes enabled

---

## Testing Checklist

1. Navigate to Work Orders tab with unlocked SOVs → verify warning shows
2. Go to SOV tab and lock all primary contract SOVs
3. Return to Work Orders tab → verify warning is gone
4. Verify New Work Order button is enabled
5. Test refresh behavior doesn't cause flickering
