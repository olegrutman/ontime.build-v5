

# FC Hourly Rate + TC Dual Counters

## Two Changes

### 1. FC Sets Their Own Hourly Rate (TC can see it, GC cannot)

Currently there's one rate (`tc_hourly_rate`) on the work order level. We add a second rate: `fc_hourly_rate` on `change_order_projects`. FC sets this once at the top of their Time Cards panel. TC can see it (to understand FC's cost). GC never sees it.

- FC sees a rate editor at the top of their panel (same style as the existing TC rate editor)
- TC sees the FC rate displayed read-only, labeled "FC Rate: $XX/hr"
- GC sees neither the FC rate nor the TC rate (unchanged from current behavior)
- FC's running totals show their earnings: total man-hours x FC rate

### 2. TC Sees Dual Counters

On the TC's Time Cards panel, replace the single set of running totals with two side-by-side summary sections:

**"FC to TC" section (what FC submitted to TC):**
- Total FC man-hours (from all FC-submitted cards)
- FC cost = FC man-hours x FC hourly rate (what TC owes FC)

**"TC to GC" section (what TC submitted to GC):**
- Total hours submitted to GC (FC hours + TC own hours, only for cards with `tc_submitted_at`)
- TC cost = submitted hours x TC hourly rate (what GC owes TC)
- Count: X of Y cards submitted

This gives TC a clear picture of both sides of the ledger.

## Database Change

Add `fc_hourly_rate` column to `change_order_projects`:

```text
ALTER TABLE change_order_projects
  ADD COLUMN fc_hourly_rate numeric DEFAULT NULL;
```

## File Changes

### `src/components/change-order-detail/TMTimeCardsPanel.tsx`

**FC rate editor:**
- Fetch `fc_hourly_rate` alongside `tc_hourly_rate` from `change_order_projects`
- Show an FC rate editor for FC users (same inline pattern as the existing TC rate editor)
- New mutation to update `change_order_projects.fc_hourly_rate`
- FC running totals: show "My Earnings" = total man-hours x fc_hourly_rate
- TC view: show FC rate read-only (not editable by TC)
- GC view: no change (sees neither rate)

**TC dual counters:**
- Replace the single running-totals row with two labeled sections
- "From Field Crew": total FC man-hours, FC cost (fc_hours x fc_rate)
- "Submitted to GC": total submitted hours, TC cost (submitted_hours x tc_rate), submitted/total count
- Keep the existing TC rate editor above these counters

### `src/types/changeOrderProject.ts`

- Add `fc_hourly_rate?: number | null` to the interface

| File | Change |
|---|---|
| New migration | Add `fc_hourly_rate` to `change_order_projects` |
| `TMTimeCardsPanel.tsx` | FC rate editor, TC dual counters, FC earnings display |
| `changeOrderProject.ts` | Add `fc_hourly_rate` to type |

