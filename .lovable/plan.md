

# Finalize T&M Work Order -- Convert Hours to Fixed Labor

## What This Does

When the T&M work is done, TC (or FC) clicks a **"Finalize T&M"** button. This:

1. Sums up all approved time card hours and costs
2. Creates corresponding fixed-price labor entries (`change_order_fc_hours` for FC, `change_order_tc_labor` for TC)
3. Switches `pricing_mode` from `'tm'` to `'fixed'`
4. The work order now behaves like a regular fixed-price work order and can proceed through the normal approval flow (Ready for Approval, GC Approve, Contract)

After finalization, the T&M time cards remain in the database for audit purposes but the detail page shows the standard fixed-price panels.

## Who Can Finalize

- **TC** can finalize at any time (they own the pricing relationship)
- **FC** can finalize only if there is no TC participant (FC-direct work orders)

A confirmation dialog warns: "This will convert all T&M hours into fixed labor entries. This cannot be undone."

## How the Conversion Works

```text
FC Labor Entry:
  pricing_type = 'hourly'
  hours = total FC man-hours (sum of all cards)
  hourly_rate = fc_hourly_rate from work order
  labor_total = hours x rate
  is_locked = true

TC Labor Entry:
  pricing_type = 'hourly'  
  hours = total hours (FC + TC own hours from all approved cards)
  hourly_rate = tc_hourly_rate from work order
  labor_total = hours x rate
```

The work order's `pricing_mode` is then updated to `'fixed'`, and the detail page automatically renders the standard fixed-price panels.

## UI Changes

### TMTimeCardsPanel.tsx

- Add a **"Finalize T&M"** button in the header area (next to "Add Time Card")
- Button is visible to TC always, or FC if no TC participant
- Button is disabled if there are unapproved/unsubmitted cards still pending
- Clicking shows an AlertDialog confirmation
- On confirm: runs the finalize mutation (insert labor entries + update pricing_mode)
- On success: invalidates queries so the page re-renders as a fixed-price work order

### ChangeOrderDetailPage.tsx

- No changes needed -- the existing conditional rendering already checks `pricing_mode === 'tm'` to show T&M panels vs fixed panels. Once mode flips to `'fixed'`, the standard panels appear automatically.

## Technical Details

### No Database Migration Needed

The finalize action uses existing tables:
- Inserts into `change_order_fc_hours` (already exists)
- Inserts into `change_order_tc_labor` (already exists)
- Updates `change_order_projects.pricing_mode` to `'fixed'` (column already exists)

### Files Changed

| File | Change |
|---|---|
| `TMTimeCardsPanel.tsx` | Add Finalize button, confirmation dialog, and finalize mutation |

### Finalize Mutation Logic

1. Query all `tm_time_cards` for this work order
2. Sum FC man-hours from all cards with `fc_submitted_at` set
3. Sum TC own hours from all cards with `tc_approved = true`
4. Insert one `change_order_fc_hours` row with the FC total (locked immediately)
5. Insert one `change_order_tc_labor` row with the full total at TC rate
6. Update `change_order_projects` set `pricing_mode = 'fixed'`
7. Invalidate all related queries

### Button Disabled Conditions

The Finalize button is disabled when:
- No time cards exist
- Any FC-submitted cards are still pending TC approval
- TC rate is not set (needed for labor entry)
- FC rate is not set (needed for FC labor entry)

