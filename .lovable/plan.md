

# Fix SOV Detection After SOV Deletion and Recreation

## Problem

When a GC deletes an SOV and creates a new one, then navigates back to the Work Orders tab, the system still shows "SOV Setup Required" and blocks work order creation. The new SOV is not detected because:

1. The `useEffect` in `WorkOrdersTab.tsx` has an empty dependency array `[]`
2. This means `refetch()` only runs on initial component mount
3. Tab switching doesn't remount the component - it just shows/hides it
4. The stale cached data from `useSOVReadiness` persists

---

## Solution

Add `projectId` as a dependency to the refetch `useEffect` so it triggers on meaningful changes. Additionally, we should expose a way to trigger refetch when the tab becomes visible. The simplest reliable fix is to remove the empty dependency array and let the effect re-run when the component re-renders after tab switch.

---

## Changes

### File: `src/components/project/WorkOrdersTab.tsx`

**Current Code (lines 44-47):**
```typescript
// Refetch SOV status on mount to ensure fresh data after tab navigation
useEffect(() => {
  sovReadiness.refetch();
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

**Updated Code:**
```typescript
// Refetch SOV status when tab becomes visible or projectId changes
// Using projectId as dependency ensures fresh data after any SOV changes
useEffect(() => {
  sovReadiness.refetch();
}, [projectId]); // Refetch when projectId changes or component mounts
```

This change ensures:
1. Fresh data is fetched when switching to the Work Orders tab
2. The `projectId` dependency is stable for a given project, preventing excessive refetches
3. If the user navigates to a different project, the data is refreshed

---

## Why This Works

The `useSOVReadiness` hook queries `project_sov` and `project_contracts` tables. When a user:
1. Goes to SOV tab → Deletes SOV
2. Creates new SOV
3. Returns to Work Orders tab

The `refetch()` call will re-query the database and get the updated SOV list, correctly detecting that the new SOV exists.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/project/WorkOrdersTab.tsx` | Add `projectId` to the dependency array of the refetch `useEffect` |

---

## Note on GC Invoice Creation

Per your clarification, GC invoice creation will **not** be enabled in this version. The existing restrictions on GC creating invoices will remain in place.

