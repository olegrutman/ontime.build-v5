

# Fix: `line_total` is a generated column — cannot insert explicitly

## Problem
Console error: `cannot insert a non-DEFAULT value into column "line_total"`. The column `co_labor_entries.line_total` is a database-generated column. The previous fix incorrectly added an explicit `line_total: computedTotal` to the insert statement.

## Fix
**`src/components/change-orders/LaborEntryForm.tsx`** line 100: Remove `line_total: computedTotal` from the insert object. The database computes it automatically from `hours`, `hourly_rate`, and `lump_sum`.

