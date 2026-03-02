
# Overview Cleanup + Materials Budget Status Card

## Summary
Remove redundant financial information from the GC/TC project overview and add a new "Materials Budget Status" card with an expanded drawer view. The card is only shown to the material-responsible party.

## Current State
The GC/TC overview currently has:
- **ContractHeroCard**: Current Contract Total, Original Contract, Approved Work Orders, TC live position
- **BillingCashCard**: Total Invoiced, Paid, Retainage, Outstanding
- **BudgetTracking**: Contains MaterialBudgetCard (Estimated Materials, Delivered POs, Ordered pending, Variance) AND LaborBudgetCard
- **CollapsibleOperations**: Activity & Operations section

The `BudgetTracking` component's `MaterialBudgetCard` already shows material budget info but in a simpler format (no forecast, no pack breakdown). This is the redundancy to address -- it duplicates material totals without the richer insight the new card provides.

## Changes

### 1. Remove MaterialBudgetCard from BudgetTracking (file: `src/components/project/BudgetTracking.tsx`)

- Remove the `MaterialBudgetCard` sub-component entirely
- Keep the `LaborBudgetCard` sub-component
- Simplify `BudgetTracking` to only render `LaborBudgetCard` when applicable (GC or FC)
- When only labor is shown, it renders as a single card without the grid wrapper
- When neither material nor labor is shown, return null (same as now minus material)

### 2. Create MaterialsBudgetStatusCard (new file: `src/components/project/MaterialsBudgetStatusCard.tsx`)

**Collapsed card** shows:
- Title: "Materials Budget Status"
- 4 labeled rows: Budget (Estimate), Materials Ordered (+/- %), Materials Delivered Net (+/- %), Projected Final Cost (+/- %)
- Status line: "On Budget" / "Trending Over Budget" / "Trending Under Budget" with green/amber/red badge
- One micro-highlight line showing the top cost driver (largest pack over budget or largest unmatched items total)
- "View details" link at bottom

**Badge coloring logic:**
- Green: forecastFinal <= estimateTotal
- Amber: 0% < variance <= 5%
- Red: variance > 5%

**Data source:** Uses `useSupplierMaterialsOverview` hook (already exists and works for any org viewing a supplier's materials -- we pass the supplier org ID from the project participants).

**Permissions:** Only rendered when `isTCMaterialResponsible` or `isGCMaterialResponsible` is true (from `financials` prop). If the user is NOT the material-responsible party, show a single muted line: "Materials controlled by {responsiblePartyName}" instead.

### 3. Create MaterialsBudgetDrawer (new file: `src/components/project/MaterialsBudgetDrawer.tsx`)

A Sheet (side drawer) opened by clicking the card. Contains 4 sections, no graph:

**Section 1 - Summary**: Same 4 numbers as collapsed card plus forecast confidence label

**Section 2 - Top Packs Over Budget (Top 5)**: Table with Pack Name, Budget, Ordered, Over/Under columns

**Section 3 - Materials Not in Estimate (Top 5)**: Table with Item, Ordered Cost, # POs, First Seen columns

**Section 4 - Risk Factors**: Bullet list with warning icons (unpriced items, packs not started, biggest upcoming pack)

### 4. Update ProjectHome.tsx layout (file: `src/pages/ProjectHome.tsx`)

Current GC/TC layout:
```text
[ContractHeroCard - full width]
[BillingCashCard | BudgetTracking(Material+Labor)] -- 2-col grid
[CollapsibleOperations]
```

New layout:
```text
[ContractHeroCard - full width]
[BillingCashCard | LaborBudget (if applicable)] -- 2-col grid (or single col if no labor)
[MaterialsBudgetStatusCard - full width]
[CollapsibleOperations]
```

- Import new `MaterialsBudgetStatusCard`
- Place it after the billing/budget row, before CollapsibleOperations
- Pass `financials`, `projectId`, and the supplier org ID (fetched from project participants)

### 5. Resolve supplier org ID for the materials card

The `useSupplierMaterialsOverview` hook needs a `supplierOrgId`. For GC/TC viewing, we need to find the SUPPLIER participant on the project. This is already available from the `project_participants` query visible in the network requests (role=SUPPLIER, organization_id). We'll add a small query or derive it from existing data in `ProjectHome.tsx` to pass the supplier org to the materials card.

## Technical Details

### Files Created
| File | Purpose |
|------|---------|
| `src/components/project/MaterialsBudgetStatusCard.tsx` | Collapsed card + drawer trigger |
| `src/components/project/MaterialsBudgetDrawer.tsx` | Expanded drawer with 4 sections |

### Files Modified
| File | Change |
|------|--------|
| `src/components/project/BudgetTracking.tsx` | Remove MaterialBudgetCard, keep only LaborBudgetCard |
| `src/pages/ProjectHome.tsx` | Add MaterialsBudgetStatusCard, fetch supplier org ID |
| `src/components/project/index.ts` | Export new components |

### No Database Changes
All data comes from the existing `useSupplierMaterialsOverview` hook and `useProjectFinancials` hook.
