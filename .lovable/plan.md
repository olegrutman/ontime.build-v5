

# Dashboard Audit Report — Formulas, Links, and Role Logic

## Issues Found

### 1. TC Contract Value Formula is Wrong (Critical)

**File:** `useDashboardData.ts` lines 350-358

For TC `contractValue` per project, the code does:
```typescript
const tcContract = projectContracts.find(c => c.to_role === 'Trade Contractor');
contractValue = tcContract?.contract_sum || null;
```

This picks the **first** contract where `to_role === 'Trade Contractor'` — which is the FC→TC contract (what TC pays FC). TC has **two directions** of contracts:
- **Revenue (from GC):** `from_role === 'Trade Contractor'` and `from_org_id === currentOrg.id` — this is what TC earns
- **Cost (to FC):** `to_role === 'Trade Contractor'` and `to_org_id === currentOrg.id` — this is what TC pays

The projects table should show the **revenue** contract (TC→GC), not the cost contract (FC→TC). Fix: filter by `from_org_id === currentOrg.id` and `to_role === 'General Contractor'`.

Additionally, TC can have **multiple** revenue contracts on a project (original + change order contracts). The value should be the **sum** of all contracts where `from_org_id === currentOrg.id`, not just the first match.

### 2. TC Revenue in Financial Summary Double-Counts (Critical)

**File:** `useDashboardData.ts` lines 511-519

```typescript
if (c.from_org_id === currentOrg.id) {
  totalRevenue += c.contract_sum || 0;  // TC→GC contracts
}
if (c.to_org_id === currentOrg.id) {
  totalCosts += c.contract_sum || 0;    // FC→TC contracts
}
```

This is correct directionally, but the issue is that **change order contracts** (Work Order + Work Order Labor trades) are also in the `project_contracts` table. These should be excluded from base contract sums since WO revenue is added separately via `change_order_projects.final_price` on line 530-532. This causes double-counting of WO revenue.

Fix: Filter out contracts where `trade` is `'Work Order'` or `'Work Order Labor'` from the base contract sum.

### 3. KPI Row — "Pending Approvals" Uses Wrong Value for TC (Medium)

**File:** `DashboardKPIRow.tsx` line 117

```typescript
const pendingApprovals = billing.outstandingToPay || billing.outstandingToCollect || 0;
```

Uses `||` fallback, so if `outstandingToPay > 0`, it never shows `outstandingToCollect`. For TC, **both** values are meaningful (TC pays FC and collects from GC). Should show both or use the more actionable one. The label says "Pending Approvals" but the value is outstanding invoices — these are different concepts.

Fix: Show `outstandingToPay + outstandingToCollect` or separate them. Better: rename to "Outstanding" and show net position, or show `outstandingToPay` for the "pay" side.

### 4. Budget Card Doesn't Separate GC vs FC Directions for TC (Medium)

**File:** `DashboardBudgetCard.tsx`

The Budget Card shows a single `totalRevenue` / `totalBilled` / `outstandingToPay`. For TC, this mixes revenue from GC with costs to FC. The card should either:
- Show **receivables** (from GC) as the primary budget view
- Or have a toggle for Receivables / Payables like the invoice tab does

### 5. "Details →" Button in Budget Card Does Nothing (Low)

**File:** `DashboardBudgetCard.tsx` line 51-53 — The button has no `onClick` handler or navigation.

### 6. "Export ↓" Button in Recent Documents Does Nothing (Low)

**File:** `DashboardRecentDocs.tsx` line 24-26 — No handler.

### 7. Recent Documents Shows Only Placeholder Data (Medium)

**File:** `DashboardRecentDocs.tsx` — The entire component shows "No recent documents" with no actual data fetching.

### 8. Live Feed Only Shows Reminders (Medium)

**File:** `DashboardLiveFeed.tsx` — Shows reminders, not actual activity. Labeled "Live" but has no real-time data.

### 9. Needs Attention — Invite Click Goes to Wrong Route (Low)

**File:** `DashboardNeedsAttentionCard.tsx` line 61

Pending invites navigate to `/project/${inv.projectId}`, but the user hasn't accepted the invite yet. They should go to the dashboard or a dedicated invite acceptance page. Navigating to the project page may fail due to RLS if the invite isn't accepted.

### 10. GC Contract Value Per Project is Wrong (Medium)

**File:** `useDashboardData.ts` lines 352-354

```typescript
const gcContract = projectContracts.find(c => c.to_role === 'General Contractor');
contractValue = gcContract?.contract_sum || null;
```

For GC, revenue should come from `owner_contract_value` or the sum of contracts where GC is the `to_org`. But `find` only gets the first contract — there can be multiple TC→GC contracts on a project. Should **sum** all contracts where `to_org_id === currentOrg.id`.

## Proposed Fixes

| # | File | Fix |
|---|------|-----|
| 1 | `useDashboardData.ts` | TC per-project value: sum all contracts where `from_org_id === currentOrg.id` (revenue from GC) |
| 2 | `useDashboardData.ts` | Exclude WO/CO trade contracts from base revenue/cost sums |
| 3 | `DashboardKPIRow.tsx` | Show both outstanding directions; rename label appropriately per role |
| 4 | `DashboardBudgetCard.tsx` | Pass org type, show receivable vs payable breakdown for TC |
| 5 | `DashboardBudgetCard.tsx` | Wire "Details →" to navigate to first active project |
| 6 | `DashboardRecentDocs.tsx` | Wire "Export ↓" or remove it |
| 7 | `DashboardRecentDocs.tsx` | Fetch real recent invoices/WOs/COs from the database |
| 8 | `DashboardLiveFeed.tsx` | Query real activity or rename to "Reminders" |
| 9 | `DashboardNeedsAttentionCard.tsx` | Route invite clicks to dashboard with invite banner |
| 10 | `useDashboardData.ts` | GC per-project value: sum all contracts where `to_org_id === currentOrg.id` |

