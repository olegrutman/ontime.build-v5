

# Math Formula Audit — GC, FC, and Supplier Bug Report

After reviewing all financial calculation logic for GC, FC, and Supplier roles, here are the bugs found:

---

## Bug 1: FC Profit formula uses wrong `workOrderTotal` (GC/TC aggregate, not FC-specific)

**File:** `src/components/project/ProfitCard.tsx`, line 105

```ts
const fcProfit = hasLaborBudget ? fcValue + workOrderTotal - laborBudget : 0;
```

`workOrderTotal` is calculated in `useProjectFinancials` from enriched totals of ALL approved work orders (the GC-to-TC price). For FC, this should be the sum of FC hours/earnings across work orders, not the full WO value. Currently the FC sees `Contract + ALL WO revenue (GC prices) - Labor Budget`, which massively inflates their contract total.

**Fix:** In `useProjectFinancials`, when `detectedRole === 'Field Crew'`, calculate a separate `fcWorkOrderEarnings` by summing `change_order_fc_hours.labor_total` for approved WOs. Use that instead of `workOrderTotal` in `ProfitCard` for FC.

---

## Bug 2: GC dashboard financials are completely empty (no GC/FC branch)

**File:** `src/hooks/useDashboardData.ts`, lines 511-555

The financial summary calculation only has an `if (orgType === 'TC')` block. For GC and FC orgs, `totalRevenue`, `totalCosts`, `totalWorkOrders`, `totalWorkOrderValue`, and `totalBilled` all remain 0. The dashboard shows zeroes for GC and FC users.

**Fix:** Add `else if (orgType === 'GC')` and `else if (orgType === 'FC')` blocks:
- **GC:** Revenue = sum of `owner_contract_value` or contract sums where GC is `to_org`. Costs = sum of contracts where GC is `to_org` (amounts owed to TCs) + WO totals. Billed = invoices received.
- **FC:** Revenue = sum of contracts where FC is `from_org` + FC hours from WOs. Costs = `labor_budget`. Billed = invoices sent by FC.

---

## Bug 3: GC `contractValue` on project card uses wrong direction

**File:** `src/hooks/useDashboardData.ts`, line 352-354

```ts
if (orgType === 'GC') {
  const gcContract = projectContracts.find(c => c.from_role === 'General Contractor');
  contractValue = gcContract?.contract_sum || null;
}
```

This finds a contract where GC is `from_role`. But in the contract model, GC is always the `to_role` (the payer). The TC is `from_role` (the biller). So GC's own contract is where `to_role === 'General Contractor'`. This returns null, showing no contract value on the GC project card.

**Fix:** Change to `c.to_role === 'General Contractor'`.

---

## Bug 4: GC `totalContracts` sums contracts where GC is `to_org` — semantically wrong

**File:** `src/hooks/useDashboardData.ts`, lines 496-498

```ts
if (orgType === 'GC' && c.to_org_id === currentOrg.id) {
  return sum + (c.contract_sum || 0);
}
```

GC is always the `to_org` (payer). This sums what GC owes to TCs, which is correct for "total contract obligations." But the variable is named `totalContracts` and displayed as a headline financial metric — this is conceptually fine but should ideally use `owner_contract_value` if available for the GC's true contract value. Minor issue, but worth noting.

**Severity:** Low — correct semantics but potentially misleading label.

---

## Bug 5: `InvoiceSummaryCard` — sentTotal includes DRAFT invoices for sender

**File:** `src/components/project/InvoiceSummaryCard.tsx`, lines 130-139

```ts
if (isSender) {
  sentTotal += amount;  // Includes ALL statuses including DRAFT
}
```

The loop iterates over all invoices regardless of status. DRAFT invoices should not be counted in `sentTotal` because they haven't been submitted yet. This inflates the "Sent to GC" and "Net Position" values for TCs.

**Fix:** Add status check: `if (isSender && invoice.status !== 'DRAFT')`.

---

## Bug 6: `InvoiceSummaryCard` — receivedTotal includes DRAFT invoices

**File:** `src/components/project/InvoiceSummaryCard.tsx`, line 137-139

Same issue for the receiver side. DRAFT invoices from FC shouldn't count as "Received from FC" for TC, or as "Invoices Received" for GC.

**Fix:** Add status check: `if (isReceiver && invoice.status !== 'DRAFT')`.

---

## Bug 7: FC `workOrderTotal` in `useProjectFinancials` includes all roles' WO totals

**File:** `src/hooks/useProjectFinancials.ts`, lines 316-320

```ts
const approvedWOs = wos.filter(wo => ['approved', 'contracted'].includes(wo.status));
const enrichedTotals = await enrichWorkOrderTotals(approvedWOs);
const woTotal = Array.from(enrichedTotals.values()).reduce((sum, v) => sum + v, 0);
setWorkOrderTotal(woTotal);
```

For FC users, `workOrderTotal` is the full GC-facing price of all approved WOs. But FC's revenue from WOs is their FC hours, not the full WO price. This value feeds into `ProfitCard` (Bug 1) and the `WorkOrderSummaryCard` GC view showing inflated numbers for FC.

**Fix:** When `detectedRole === 'Field Crew'`, also calculate FC-specific WO earnings from `change_order_fc_hours` and expose as a separate field (e.g., `fcWorkOrderEarnings`).

---

## Bug 8: Supplier financials don't include tax in `supplierInvoiced`/`supplierPaid`

**File:** `src/hooks/useProjectFinancials.ts`, lines 184-190

Supplier `orderValue` is calculated from PO line items (no tax included). Invoices use `total_amount`. If the supplier invoice includes tax but PO value doesn't, the comparison is mismatched. This is a minor inconsistency but could confuse suppliers comparing "ordered" vs "invoiced."

**Severity:** Low — data comes from different sources with different tax treatment.

---

## Summary

| # | Location | Issue | Severity |
|---|----------|-------|----------|
| 1 | ProfitCard (FC) | FC profit uses full WO total instead of FC earnings | **High** |
| 2 | useDashboardData | GC and FC financials are all zeroes | **High** |
| 3 | useDashboardData | GC project card contract value uses wrong direction | **High** |
| 4 | useDashboardData | GC totalContracts semantics (minor) | Low |
| 5 | InvoiceSummaryCard | sentTotal includes DRAFT invoices | Medium |
| 6 | InvoiceSummaryCard | receivedTotal includes DRAFT invoices | Medium |
| 7 | useProjectFinancials | FC workOrderTotal is GC-facing, not FC-specific | **High** |
| 8 | useProjectFinancials | Supplier order value excludes tax | Low |

## Files to Edit
- `src/components/project/ProfitCard.tsx` — Bug 1 (use FC-specific earnings)
- `src/hooks/useDashboardData.ts` — Bugs 2, 3 (add GC/FC financial blocks, fix contract direction)
- `src/hooks/useProjectFinancials.ts` — Bug 7 (calculate FC-specific WO earnings)
- `src/components/project/InvoiceSummaryCard.tsx` — Bugs 5, 6 (filter out DRAFT from totals)

