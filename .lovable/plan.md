

# Work Order-Level Hourly Rate + FC Visibility Fix

## Two Changes

### 1. Set Hourly Rate Once at the Work Order Level

Instead of setting a rate on each time card, TC (or FC) sets it once at the top of the Time Cards panel. It saves to `change_order_projects.tc_hourly_rate` and applies to all cards automatically.

- A rate editor appears between the header and running totals
- Shows current rate with an Edit button
- All cost calculations use this single rate
- Per-card rate editing is removed

### 2. FC Cannot See TC-Submitted Data

FC should only see their own time cards and their statuses (draft, submitted, approved, rejected). They should NOT see:
- TC's own hours (`tc_own_hours`)
- The hourly rate or cost calculations
- TC submission status to GC
- GC acknowledgment status

FC sees: date, their men count, hours, man-hours, description, and whether TC approved/rejected their card.

## Database Change

Add `tc_hourly_rate` column to `change_order_projects`:

```text
ALTER TABLE change_order_projects
  ADD COLUMN tc_hourly_rate numeric DEFAULT NULL;
```

No other schema changes needed.

## File Changes

### `src/components/change-order-detail/TMTimeCardsPanel.tsx`

**Rate editor at top (for TC/FC):**
- Fetch the work order's `tc_hourly_rate` from `change_order_projects`
- Show an inline rate display/editor above the running totals (visible to TC and FC only, not GC)
- New mutation to update `change_order_projects.tc_hourly_rate`
- Remove per-card rate state (`editingRateId`, `rateValue`, `setRateMutation`)

**Cost calculations use work-order rate:**
- `totalCost` uses the work-order-level rate instead of per-card `tc_hourly_rate`
- Per-card cost display also uses the work-order rate

**FC visibility restrictions:**
- FC filter: only show cards where `fc_entered_by === user.id` (their own cards only)
- FC view hides: TC own hours, hourly rate, cost, "Submitted to GC" badge, GC acknowledgment
- FC running totals show only man-hours count (no cost)
- FC status badges limited to: Draft, Submitted, Approved, Rejected (no "Submitted to GC" or "Acknowledged")

### `src/types/changeOrderProject.ts`

- Add `tc_hourly_rate?: number | null` to the `ChangeOrderProject` interface

| File | Change |
|---|---|
| New migration | Add `tc_hourly_rate` to `change_order_projects` |
| `TMTimeCardsPanel.tsx` | Add WO-level rate editor, remove per-card rate, restrict FC view |
| `changeOrderProject.ts` | Add `tc_hourly_rate` to type |

