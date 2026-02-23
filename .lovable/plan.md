
# Fix: Revise & Resubmit Button Not Showing on Rejected Invoices

## Problem
The "Revise & Resubmit" button on rejected invoices is gated solely by `canSubmit`, which requires the contract's `from_org_id` to match the current user's organization. If the contract fetch fails silently or the user's org doesn't match due to a data issue, the button disappears entirely.

## Solution
Add a fallback check using `invoice.created_by === user?.id` so the button appears for any user who either:
- Belongs to the contract's `from_org` (existing check), OR
- Is the original invoice creator (new fallback)

This makes the feature more robust against contract fetch failures.

## File Changes

| File | Change |
|------|--------|
| `src/components/invoices/InvoiceDetail.tsx` | Add `canRevise` condition combining `canSubmit` with `created_by` check; use it for the button |

## Technical Details

### InvoiceDetail.tsx

**Line ~236**: Add a new `canRevise` variable:
```typescript
const canSubmit = isInvoiceCreator;
const canApprove = isInvoiceReceiver;
const canRevise = canSubmit || invoice?.created_by === user?.id;
```

**Line ~365**: Replace `canSubmit` with `canRevise` for the Revise & Resubmit button:
```tsx
{canRevise && (
  <Button onClick={handleRevise} ...>
    Revise & Resubmit
  </Button>
)}
```

This is a single-file, two-line change.
