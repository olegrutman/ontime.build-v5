

# Fix: Add `data-sasha-card` to All Overview Page Cards

## Problem
The highlight overlay logic works correctly, but most cards on the Overview page are missing the `data-sasha-card` attribute. Only `ProfitCard`, `MaterialsBudgetStatusCard`, and `AttentionBanner` have it. When the user activates highlight mode, only those few cards are detectable — the rest are invisible to `elementsFromPoint` + `closest('[data-sasha-card]')`.

## Fix
Add `data-sasha-card` attributes to every card component rendered on the overview page:

| File | Root element | Attribute to add |
|------|-------------|------------------|
| `ContractHeroCard.tsx` | Multiple `<div>` return branches (lines 64, 85, 119, 145, 169) | `data-sasha-card="Contract"` |
| `BillingCashCard.tsx` | `<div>` at lines 49, ~85 (GC view) | `data-sasha-card="Billing & Cash"` |
| `WorkOrderSummaryCard.tsx` | `<Card>` at line 247 | `data-sasha-card="Work Orders"` |
| `BudgetTracking.tsx` (LaborBudgetCard) | `<div>` at lines 59, 79 | `data-sasha-card="Labor Budget"` |
| `UrgentTasksCard.tsx` | `<div>` at lines 64, 72 | `data-sasha-card="Urgent Tasks"` |
| `TeamMembersCard.tsx` | `<div>` at line 149 | `data-sasha-card="Team"` |
| `ProjectReadinessCard.tsx` | `<Card>` at lines 16, 26, 40 | `data-sasha-card="Project Readiness"` |

Each file gets a simple one-attribute addition to its root wrapper element(s). No logic changes needed — the overlay and Sasha integration already handle the rest.

## Notes
- Cards with multiple return paths (e.g. `ContractHeroCard` has edit, create, supplier, FC, and default views) need the attribute on each branch's root element
- The overlay's `findCardAt` → `elementsFromPoint` → `closest('[data-sasha-card]')` chain will automatically pick up all newly tagged elements

