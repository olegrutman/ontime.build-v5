

# Actual Cost Tracker for FC & Self-Performing TC

## What This Does (Plain English)

Right now, Field Contractors (FC) log their **earnings** (what the TC pays them), but they have no way to track their **actual costs** — what they actually spend on labor, materials, gas, equipment rental, etc. Same issue for Trade Contractors working without an FC (self-performing) — they can only enter one lump-sum internal cost.

This feature adds an **Actual Cost Log** — a simple daily journal where FC (or self-performing TC) can tap on their cost number and a small popup appears to record entries. Each entry is either:
- **Hours**: number of workers × hours × their internal hourly rate
- **Lump Sum**: a flat dollar amount (e.g., equipment rental, fuel)

They can log costs daily or whenever they want. A small report shows running totals, daily breakdown, and profit margin (earnings minus actual costs).

## Implementation

### 1. New Database Table: `actual_cost_entries`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| change_order_id | FK → change_order_projects | Which work order |
| entry_date | date | When the cost was incurred |
| cost_type | text | 'hours' or 'lump_sum' |
| description | text | What the cost was for |
| men_count | int | Number of workers (hours type) |
| hours_per_man | numeric | Hours each (hours type) |
| hourly_rate | numeric | Internal rate per hour |
| lump_amount | numeric | Flat cost (lump_sum type) |
| total_amount | numeric | Computed: men×hours×rate or lump |
| entered_by | uuid | User who logged it |
| organization_id | FK → organizations | Which org's cost |
| created_at | timestamptz | |

RLS: Users can only CRUD entries for their own organization. TC/GC cannot see FC's actual costs (private data).

### 2. New Component: `ActualCostPopup`

A small dialog/popover triggered by tapping the "Actual Cost" value in the FC earnings view or TC internal cost card. Contains:
- **Entry form**: Date, type toggle (Hours / Lump Sum), fields for men/hours/rate or amount, description
- **Entry list**: Daily entries with running total
- **Summary**: Total actual cost, profit margin vs earnings

### 3. New Component: `ActualCostReport`

A collapsible section below the popup showing:
- Daily breakdown table (date, description, amount)
- Running total
- Profit = Earnings − Actual Costs (for FC) or Revenue − Actual Costs (for self-performing TC)

### 4. Integration Points

**FC view** (`ContractedPricingCard.tsx` → `FCEarningsView`): Make the "TOTAL EARNINGS" value tappable. Below it, show actual cost total and profit. Tapping opens the popup.

**TC self-performing** (`TCInternalCostEditor.tsx`): Replace the single lump-sum input with the same daily cost log, keeping backward compatibility (existing `tc_internal_cost` becomes the sum of entries).

**ChangeOrderDetailPage.tsx**: Add the `ActualCostPopup` component for FC and self-performing TC roles.

### Files

| File | Change |
|------|--------|
| Migration SQL | Create `actual_cost_entries` table with RLS |
| `src/components/change-order-detail/ActualCostPopup.tsx` | New — dialog with entry form + list |
| `src/components/change-order-detail/ActualCostReport.tsx` | New — daily breakdown report |
| `src/hooks/useActualCosts.ts` | New — CRUD hook for cost entries |
| `src/components/change-order-detail/ContractedPricingCard.tsx` | Make FC earnings tappable, show actual cost summary |
| `src/components/change-order-detail/TCInternalCostEditor.tsx` | Add daily logging option alongside lump sum |
| `src/components/change-order-detail/ChangeOrderDetailPage.tsx` | Wire up ActualCostPopup for FC and self-performing TC |

