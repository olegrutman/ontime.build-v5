

# Fix FC Labor Budget Setting

## Problem
Two issues prevent FC from setting their labor budget:

1. **Wrong contract used for labor budget** (`useProjectFinancials.ts` lines 321-326): The `laborBudget` state is always read from the GC↔TC contract, regardless of viewer role. For FC users, it should come from the TC↔FC contract.

2. **Wrong contract passed to BudgetTracking** (`BudgetTracking.tsx`): The component receives `upstreamContract` (GC↔TC), but for FC the labor budget lives on the `downstreamContract` (TC↔FC).

## Changes

### 1. `src/hooks/useProjectFinancials.ts` (line 321-326)
Read `laborBudget` from the role-appropriate contract:
- If `detectedRole === 'Field Crew'`, find the TC↔FC contract and read its `labor_budget`
- Otherwise, keep existing logic (GC↔TC contract)

### 2. `src/components/project/BudgetTracking.tsx` (line 27)
The component currently only uses `upstreamContract` for the update call. It needs to accept the correct contract based on role. Two options:
- Change to use `financials.upstreamContract` for GC/TC and `financials.downstreamContract` for FC
- The simplest fix: pass the role-appropriate contract. Since `BudgetTracking` already checks `viewerRole`, derive the correct contract inside the component.

Concrete change: In `BudgetTracking`, pass `downstreamContract` when `viewerRole === 'Field Crew'`, otherwise `upstreamContract`.

**2 files modified. No database changes.**

