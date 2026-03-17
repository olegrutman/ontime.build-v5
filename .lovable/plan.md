

# Combined CO: Show as One CO with Multiple Scopes

## Problem
When GC combines multiple COs, the list shows individual member COs separately (and the parent CO is empty). The receiving party should see one unified CO with multiple scope sections.

## Approach

### 1. `useChangeOrders.ts` — Filter members, enrich parent
- Filter out COs where `combined_co_id` is set (these are members absorbed into a parent)
- For parent combined COs (status=`combined` and no `combined_co_id`), fetch member titles from `co_combined_members` joined with `change_orders` to display as sub-labels
- This applies to both "mine" and "sharedWithMe" groupings

### 2. `COListPage.tsx` — Show combined parent with member previews
- For combined parent COs, display the combined title (or "Combined CO") with member CO titles listed below as chips/sub-text (e.g., "ZIP System — tape & seal + Decorative knee brace")
- Add a `GitMerge` icon indicator on combined rows

### 3. `useChangeOrderDetail.ts` — Fetch member CO data for combined parents
- Add a new query: when the CO has status=`combined` and no `combined_co_id` (i.e., it's a parent), fetch member CO IDs from `co_combined_members`
- Fetch line items, labor entries, materials, and equipment for ALL member COs (using `.in('co_id', memberCoIds)`)
- Return `memberCOs` array (the member CO records themselves, for title/location/reason)
- Financials calculation already sums arrays — just needs the expanded data

### 4. `CODetailPage.tsx` — Multi-scope display
- When `memberCOs` exist, group line items by their `co_id` and display under collapsible sections headed by each member CO's title, location, and reason
- Each scope section shows its own line items with labor, but materials/equipment remain aggregated at the combined level
- Header shows the combined CO title with a "X scopes" indicator
- Financial summary aggregates across all member scopes

### 5. `COStatusActions.tsx` — Allow sharing/submitting combined parent
- The combined parent currently has status=`combined` which blocks sharing. Add `combined` to `canShare` and `canSubmit` conditions for the parent (no `combined_co_id` means it's the parent, not a member)
- When the parent is shared/submitted, update its status normally

## No DB changes needed
All data relationships already exist via `co_combined_members`. We just need to query member data when viewing the parent.

