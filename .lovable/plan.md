

# Bugs in the Needs Attention Card

After analyzing the `DashboardNeedsAttentionCard` component and the `useDashboardData` hook that feeds it, here are the bugs found:

## Bug 1: Dead `change_order` type — ghost items can never appear but code still handles them
The `pendingCOsResult` query was replaced with `Promise.resolve({ data: [] })` (line 210), so `pendingCOs` is always empty. Yet the code still iterates `pendingCOs` (lines 301-312), the `AttentionItem` interface still declares `'change_order'` as a valid type, the `typeConfig` still has a `change_order` entry, and `needsAttention.changeOrders` is still computed. This is dead code that should be cleaned up to avoid confusion.

## Bug 2: `RecentDoc` type still includes `'change_order'`
The `RecentDoc` interface (line 66) still has `type: 'invoice' | 'change_order'`, and the `recentCOs` loop (lines 477-489) iterates an always-empty array. Dead code.

## Bug 3: GC financial calculation still filters out "Work Order" trades
In the GC branch (lines 588-605), there's still a `isBaseContract` filter excluding contracts with `trade === 'Work Order'` or `'Work Order Labor'`. Since WO tables are gone and no new WO contracts can be created, this filter is stale. It could silently exclude legacy contracts if any exist with those trade values, leading to incorrect financial totals on the dashboard.

## Bug 4: FC comment references WO hours that no longer exist
Line 616 comment says "FC Revenue = contracts where FC is from_org + FC hours from WOs" but the WO hours code was removed. Misleading comment.

## Bug 5: `needsAttention.changeOrders` is always 0 but still exposed
The dashboard data hook returns `needsAttention.changeOrders` which will always be 0. Any consumer checking this value gets a false sense that the feature exists.

---

## Proposed Fix

### `src/hooks/useDashboardData.ts`
- Remove `'change_order'` from `AttentionItem.type` — make it `'invoice' | 'invite'`
- Remove `'change_order'` from `RecentDoc.type` — make it just `'invoice'`
- Delete the `pendingCOs` iteration block (lines 301-312)
- Delete the `recentCOs` iteration block (lines 477-489)
- Remove `changeOrders` from the `needsAttention` memo
- Remove the `isBaseContract` filter in the GC branch — treat all contracts equally
- Fix stale comments referencing WOs

### `src/components/dashboard/DashboardNeedsAttentionCard.tsx`
- Remove `'change_order'` from the `AttentionItem.type` union
- Remove the `change_order` entry from `typeConfig`

### `src/components/dashboard/DashboardRecentDocs.tsx` (if it uses `change_order` type)
- Remove change order type handling

These are all straightforward dead-code removals and type narrowings. No behavioral change for live features.

