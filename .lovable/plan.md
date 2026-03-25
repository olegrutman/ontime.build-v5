

# Replace Pending/Outstanding with Profit Margin KPI

## Problem
"Pending Review" and "Outstanding" show essentially the same concept. Instead, show a **Profit Margin** card that displays the difference between "Paid to You" and "Paid by You".

## Changes

### `src/components/dashboard/DashboardKPIRow.tsx`
- Remove the "Pending Review" and "Outstanding" cards
- Add a single **"Profit Margin"** card:
  - **Value**: `paidToYou - paidByYou`
  - **Tag**: percentage margin (`paidToYou > 0 ? ((profit / paidToYou) * 100) : 0`) with green if positive, red if negative
  - **Sub text**: "Net from paid invoices"
  - **Bar**: profit as % of contract value
- Grid goes from `lg:grid-cols-5` → `lg:grid-cols-4`
- Remove `billing` and `attentionCount` props since they're no longer needed

### `src/pages/Dashboard.tsx`
- Stop passing `billing` and `attentionCount` to `DashboardKPIRow`

