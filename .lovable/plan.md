
# Move "Needs Attention" Up + Add Sidebar Warning Badges

## Problem

Currently the **"Needs Attention"** card sits at the very bottom of the project overview (after KPIs and the Buyer Materials Analytics section) — users have to scroll past 2,000+ pixels of dense tables to discover that 17 COs are pending review. The sidebar already shows badges for `change-orders`, `invoices`, and `purchase-orders` based on `SUBMITTED` counts, but it ignores RFIs, material delivery alerts, and budget-health warnings that the overview surfaces. So warnings are duplicated in two places, both poorly placed.

## Goal

1. **Surface "Needs Attention" at the top of the project overview** — directly under the project header, before any KPI cards, so it's always visible without scrolling.
2. **Mirror the same warning signals as badges in the persistent left sidebar** so users see attention items even when on Invoices, POs, Schedule, etc.
3. Remove the duplicated bottom section to avoid showing the same data twice.

## Design

### A. Overview placement

Move the existing "🚨 Needs Attention" block from the bottom of:

- `src/components/project/GCProjectOverviewContent.tsx` (line ~684)
- `src/components/project/TCProjectOverview.tsx` (line ~761)

…to render **above the `<KpiGrid>`**, right after the project header. Keep the same `WarnItem` rows and styling so it feels familiar. When `warnings.length === 0`, render nothing (current behavior preserved).

### B. Compact styling at the top

The current card is a vertical list of full-width rows. At the top of the page that takes too much vertical space when there are 4+ items. Switch to a **horizontal compact layout** at the top:

```text
┌────────────────────────────────────────────────────────────────────┐
│ 🚨 Needs Attention   [💰 3 Invoices] [📝 17 COs] [❓ 2 RFIs] [🚚 …] │
└────────────────────────────────────────────────────────────────────┘
```

Each chip is clickable and routes to the relevant tab (same `tab` field already on each warning). Falls back to the vertical list on mobile (<640px). This keeps the top of the page dense without dominating it.

### C. Sidebar warning badges

Extend `useSidebarAttention(projectId)` (currently only counts `SUBMITTED` invoices/POs/COs) so it also returns:

| Sidebar route   | New signal added                                     |
|-----------------|------------------------------------------------------|
| `change-orders` | already present (SUBMITTED count) — no change        |
| `invoices`      | already present                                       |
| `purchase-orders` | already present                                     |
| `rfis`          | **NEW** — count of `open` RFIs on the project        |
| `purchase-orders` | **+** add `materialOrderedPending > 0` → +1 to badge if delivery is unconfirmed |

The badge component (`AttentionBadge`) already exists and is wired up via `attentionCounts[item.route]`. We just expand the hook.

### D. Cleanup

Delete the bottom warnings block in both overview files. Keep the unused legacy components (`AttentionBanner`, `CompactAlertBar`) untouched since they're imported elsewhere (`ProjectHome.tsx` uses `CompactAlertBar`).

## Technical Details

### 1. `useSidebarAttention.ts`

Add two queries in parallel with the existing three:

```ts
supabase.from('rfis').select('id', { count: 'exact', head: true })
  .eq('project_id', projectId).eq('status', 'open'),
supabase.from('purchase_orders').select('id', { count: 'exact', head: true })
  .eq('project_id', projectId).in('status', ['ORDERED','READY_FOR_DELIVERY']),
```

Merge `rfis` count into `result['rfis']`, and add the pending-delivery count into `result['purchase-orders']` on top of the existing SUBMITTED count.

### 2. New component `OverviewAttentionStrip.tsx`

Small presentational component that takes `warnings: WarningItem[]` + `onNavigate` and renders the horizontal chip strip described above. Lives in `src/components/project/`.

### 3. Update both overviews

- Compute `warnings` array same as today (already done).
- Pass it to `<OverviewAttentionStrip>` placed at the top, right above `<KpiGrid>`.
- Delete the bottom `{warnings.length > 0 && (...)}` block.

## Files Affected

- `src/hooks/useSidebarAttention.ts` — add 2 queries, return more counts
- `src/components/project/OverviewAttentionStrip.tsx` — **NEW**
- `src/components/project/GCProjectOverviewContent.tsx` — move warnings to top, compact format
- `src/components/project/TCProjectOverview.tsx` — same change

## Out of Scope

- Real-time updates (badges refresh on page load only — same as today).
- Dashboard-level (cross-project) warnings — only the per-project sidebar.
- `ProjectHome.tsx` `CompactAlertBar` is left as-is since it's a different render path.
