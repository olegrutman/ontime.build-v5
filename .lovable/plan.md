
# Show TC Company Name and Hours/Rate on Labor Card

## Problem
The labor card shows "Trade Contractor Labor" instead of the TC company name because the code looks for `participants.find(p => p.role === 'TC')`, but the actual participant has `role: 'PARTICIPANT'` (the organization type is `TC` though). This means `tcCompanyName` is always undefined.

Additionally, the user wants to see the TC's hours and hourly rate clearly when the card is expanded -- this already works in the code, but the company name issue makes it look generic.

## Root Cause
When participants are added as "additional participants" (not the primary assigned TC), their role is stored as `'PARTICIPANT'` rather than `'TC'`. The organization itself has `type: 'TC'`, but the lookup uses the participant role field.

## Fix

### File: `src/components/change-order-detail/ChangeOrderDetailPage.tsx`

Update the TC company name lookup (line 417) to fall back to checking `organization.type`:

```tsx
// Before:
participants.find(p => p.role === 'TC' && p.is_active)?.organization?.name

// After:
participants.find(p => (p.role === 'TC' || p.organization?.type === 'TC') && p.is_active)?.organization?.name
```

This single line change ensures the TC company name (e.g., "IMIS, LLC") appears in the labor card title as "Labor - IMIS, LLC" regardless of whether their participant role is stored as `'TC'` or `'PARTICIPANT'`.

### No changes needed to GCLaborReviewPanel
The expanded view already shows Description, Hours, Rate, and Total columns with the correct data (25 hrs at $55.00/hr = $1,375.00). The only issue was the missing company name, which is fixed by the lookup change above.
