

# Fix: Contract Values Wiped + Missing Second SOV

## Root Cause

**`selectBuildingType` on line 1002-1003 of `useSetupWizardV2.ts` calls `setAnswers({})` — this wipes ALL answers, including `contract_value` and `fc_contract_value` entered in Step 1 (Contracts).**

Step order: Basics → **Contracts** (enter $) → **Building Type** (wipes $) → Scope → Review ($0)

This single bug causes both reported issues:
1. Contract value shows $0 in Review
2. Second SOV missing (because `fcContractValue` is 0, the TC→FC SOV condition `isTC && fcContractValue > 0` is false)

## Fix

### `src/hooks/useSetupWizardV2.ts`
- Change `selectBuildingType` to preserve `contract_value`, `fc_contract_value`, and `material_responsibility` when clearing scope answers:

```typescript
const selectBuildingType = useCallback((bt: BuildingType) => {
  setBuildingType(bt);
  // Preserve contract values when resetting scope answers
  setAnswers(prev => ({
    contract_value: prev.contract_value,
    fc_contract_value: prev.fc_contract_value,
    material_responsibility: prev.material_responsibility,
  }));
}, []);
```

No other files need changes — the Review step and SOV generation already read from `answers.contract_value` correctly.

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Preserve contract fields in `selectBuildingType` instead of wiping all answers |

