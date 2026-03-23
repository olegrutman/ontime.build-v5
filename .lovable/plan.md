

# Bug: Dashboard Recent Invoices Shows All Invoices Without Org Filtering

## Problem Found

In `src/hooks/useDashboardData.ts` lines 410-417, the "Recent Invoices" query fetches ALL invoices across all projects the user participates in, with **zero org-based filtering**:

```ts
supabase
  .from('invoices')
  .select('id, invoice_number, status, total_amount, created_at, project_id')
  .in('project_id', projectIds)  // no contract/org filter
```

This is why TC sees `INV-SU-0001` (a supplier-to-GC invoice where TC has no involvement). The `InvoicesTab` correctly filters by contract ownership, but the dashboard bypasses all of that.

## Fix

**File: `src/hooks/useDashboardData.ts`** — lines 433-452

After building `recentDocsList`, filter it using the same `contractDetailMap` already built (line 456). Also fetch PO pricing ownership for PO-linked invoices.

1. Move the `contractDetailMap` build **before** the recentDocs processing (it's currently after)
2. Also fetch `contract_id` and `po_id` in the recent invoices query
3. Filter recent invoices:
   - **Contract-linked invoices**: only show if `from_org_id` or `to_org_id` matches `currentOrg.id`
   - **PO-linked invoices** (no contract_id): only show if user's org is the `pricing_owner_org_id` or the supplier's org
   - **No contract, no PO**: exclude (shouldn't exist, but safe)

This mirrors the exact same logic used in `InvoicesTab.tsx`.

## Other Pages Checked

- **InvoicesTab**: Already fixed with contract-based filtering
- **DashboardKPIRow**: Financial calculations (billing.invoicesPaid, outstandingToPay/Collect) already filter by contract org — correct
- **SOV page**: Already filtered by org
- **Scope Details**: Already filtered by org

The dashboard Recent Invoices is the only remaining gap.

## Files changed

| File | Change |
|------|--------|
| `src/hooks/useDashboardData.ts` | Filter recentDocs by contract org membership and PO pricing ownership |

