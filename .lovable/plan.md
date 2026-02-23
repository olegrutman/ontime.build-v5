

# Fix: Material Responsibility Card Not Showing

## Problem
The `MaterialResponsibilityCard` queries for contracts where `from_role = 'TC'`, but the actual database stores full role names like `'Trade Contractor'`. The query returns no results, so the card renders nothing.

**Database reality:**
- `from_role = 'Trade Contractor'` (not `'TC'`)
- `to_role = 'General Contractor'` (not `'GC'`)

## Fix

### File: `src/components/project/MaterialResponsibilityCard.tsx`

**Line 45** -- Change the filter from `'TC'` to `'Trade Contractor'`:

```
Before: .eq('from_role', 'TC')
After:  .eq('from_role', 'Trade Contractor')
```

That single line change will make the card find the contract and display correctly.

