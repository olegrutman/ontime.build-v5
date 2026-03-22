

# Fix: Restrict Invoice Visibility Per Organization

## Bug

**File: `src/components/invoices/InvoicesTab.tsx`**, line 221-225

The visibility filter has a fallback that shows **all invoices** when the user has no contracts loaded:

```ts
const visibleInvoices = currentOrgId && contractIds.length > 0
  ? allInvoices.filter(inv => !inv.contract_id || contractIds.includes(inv.contract_id))
  : allInvoices;  // ← BUG: shows everything
```

This means:
- **FC sees TC→GC invoices** because FC has no GC↔TC contract, so `contractIds.length === 0`, and the fallback returns all invoices
- **TC sees supplier invoices** for POs where TC is not the pricing owner, because `!inv.contract_id` lets all PO-based invoices through regardless of org

## Fix

**File: `src/components/invoices/InvoicesTab.tsx`**

1. **Remove the fallback to `allInvoices`** — when user has no contracts, only PO-based invoices (no `contract_id`) should pass through, not contract-linked invoices from other org pairs
2. **When no `currentOrgId`**, show nothing instead of everything

Change line 221-225 from:
```ts
const visibleInvoices = currentOrgId && contractIds.length > 0
  ? allInvoices.filter(inv => !inv.contract_id || contractIds.includes(inv.contract_id))
  : allInvoices;
```
to:
```ts
const visibleInvoices = currentOrgId
  ? allInvoices.filter(inv => !inv.contract_id || contractIds.includes(inv.contract_id))
  : [];
```

This ensures:
- Contract-linked invoices are only visible if the user's org is a party to that contract
- PO-based invoices still pass through (they have no `contract_id`), but the downstream categorization (lines 91-117) already correctly filters them by pricing owner / supplier org
- If no org is loaded yet, nothing is shown (prevents flash of all data)

| File | Change |
|------|--------|
| `src/components/invoices/InvoicesTab.tsx` | Fix visibility filter fallback — never show all invoices when user has no matching contracts |

