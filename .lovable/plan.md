

# TC Internal Cost Tracking for Profit Margin

## Problem
When a TC is self-performing (no FC), the profit calculation in `ContractedPricingCard` shows `profit = revenue - 0 = revenue` because `fcCost` is derived from FC hours, which don't exist. The TC has no way to enter their own internal labor cost, making the profit margin meaningless.

## Solution
Add a `tc_internal_cost` field to `change_order_projects` so the TC can record what the work actually costs them (labor, overhead, etc.). This applies to both fixed-price and T&M work orders when no FC is involved. The profit calculation then becomes: `profit = revenue - tc_internal_cost - materialCost`.

---

## Plan

### 1. Add `tc_internal_cost` column to database
**Migration:** Add `tc_internal_cost numeric default 0` to `change_order_projects`.

### 2. Create TC Internal Cost editor component
**New file:** `src/components/change-order-detail/TCInternalCostEditor.tsx`
- Simple card with a dollar input for TC to enter their internal cost
- Only visible to TC when `hasFCParticipant` is false (self-performing)
- Editable during `draft`, `tc_pricing` statuses
- Saves to `change_order_projects.tc_internal_cost` via mutation

### 3. Wire into the detail page
**File:** `ChangeOrderDetailPage.tsx`
- Show `TCInternalCostEditor` below `TCPricingPanel` (fixed) or below `TMTimeCardsPanel` (T&M) when TC is self-performing
- Pass the current value and update handler

### 4. Fix profit calculation in ContractedPricingCard
**File:** `ContractedPricingCard.tsx`
- When no FC participant: use `tc_internal_cost` as the cost instead of `fcCost`
- Update `TCPricingView` to show "Internal Cost" instead of "Field Crew" when self-performing
- Profit = `revenue - tc_internal_cost - materialCost`

### 5. Update TypeScript types
**File:** `src/types/changeOrderProject.ts`
- Add `tc_internal_cost?: number` to `ChangeOrderProject`

---

## Files to Edit
- New migration — add `tc_internal_cost` column
- New: `src/components/change-order-detail/TCInternalCostEditor.tsx`
- `src/components/change-order-detail/ChangeOrderDetailPage.tsx` — render cost editor
- `src/components/change-order-detail/ContractedPricingCard.tsx` — use internal cost in profit calc
- `src/types/changeOrderProject.ts` — add field

