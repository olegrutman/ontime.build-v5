

# Fix Garage Lines Not Showing in SOV Preview

## Problem
When a user answers "Yes" to the garage question for Custom Home, the value is stored as `{ enabled: true, subtype: 'Attached' }` (because it uses `yes_no_subtype` input type). But the SOV generation check on line 751 only tests `a.has_garage === 'yes'`, which fails for the object format. Result: garage never appears in the SOV preview for Custom Home.

Townhome uses a simple `yes_no` (stores `'yes'`), and Track Home uses `garage_type` dropdown — both work. Only Custom Home is broken.

## Fix

### `src/hooks/useSetupWizardV2.ts` — line 751

Update the garage condition to handle all three answer formats:

```
// Before
if (i === 1 && (a.has_garage === 'yes' || (a.garage_type && a.garage_type !== 'No garage')))

// After  
if (i === 1 && (a.has_garage === 'yes' || a.has_garage?.enabled === true || (a.garage_type && a.garage_type !== 'No garage')))
```

One line change. No other files affected.

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Fix garage condition to handle `yes_no_subtype` object format |

