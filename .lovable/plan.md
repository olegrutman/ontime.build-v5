
# Fix: Organization Search Returns No Results When Filtering

## Problem
When searching for organizations by name (e.g., "IMIS"), the search returns no results even though matching organizations exist in the database.

**Root Cause**: The State and Trade dropdowns use `"__all__"` as the value for "Any state" / "Any trade" options. In `JoinSearchStep.tsx`, the code sends `state || null` to the RPC -- but since `"__all__"` is truthy, it gets passed as-is. The SQL function then tries to match `(o.address->>'state') ILIKE '__all__'`, which matches nothing, so the entire query returns zero rows.

## Fix

**File: `src/components/signup-wizard/JoinSearchStep.tsx`**

Update the `handleSearch` function (around line 41) to convert `"__all__"` to `null` before calling the RPC:

```typescript
const { data, error } = await supabase.rpc('search_organizations_for_join', {
  _state: (state && state !== '__all__') ? state : null,
  _trade: (trade && trade !== '__all__') ? trade : null,
  _query: query || null,
  _limit: 20,
});
```

This is a two-line fix. No database changes needed -- the SQL function already handles `NULL` correctly.
