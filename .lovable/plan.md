

# Move Actual Cost Tracker to Labor Budget Card

## What Changes

The `BudgetTracking.tsx` (Labor Budget card) becomes the home for the Actual Cost Tracker. The card currently shows: Budget → Actual (placeholder) → Remaining → % Used. We make the "Actual" row tappable to open `ActualCostPopup`, and the "Actual" value reflects real logged entries instead of a static number.

### 1. `BudgetTracking.tsx`
- Import `ActualCostPopup` and `useActualCosts`
- Accept `projectId` prop (already has it via parent)
- Make the "Actual" row tappable → opens `ActualCostPopup` scoped to the project
- Replace `actualLaborCost` with `totalActualCost` from the hook when entries exist (fall back to `actualLaborCost` if no entries)
- Show Budget vs Actual Cost variance properly

### 2. `ProfitCard.tsx`
- Remove the actual cost popup integration from ProfitCard (FC and TC sections)
- Remove `useActualCosts` import and `costPopupOpen` state
- Keep profit math but use the `totalActualCost` from the hook for profit calculation (or accept it as a prop from parent)
- The "Actual Cost" / "Internal Cost" tappable rows move out of ProfitCard

### 3. Files

| File | Change |
|------|--------|
| `src/components/project/BudgetTracking.tsx` | Add tappable actual cost row, integrate `ActualCostPopup` |
| `src/components/project/ProfitCard.tsx` | Remove actual cost popup, simplify to pure profit display |

