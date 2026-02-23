
# Hide Material Estimate vs Orders Chart for Non-Responsible Party

## Problem
The "Material Estimate vs Orders" bar chart in `FinancialHealthCharts` still shows even when the viewer's party is not responsible for materials. This is inconsistent with the hiding already applied to `FinancialSignalBar`.

## Fix

### 1. `src/components/project/FinancialHealthCharts.tsx`
- Add a new prop: `hideMaterialCards?: boolean`
- When `hideMaterialCards` is true, skip rendering the "Material Estimate vs Orders" bar chart (lines 24-53)

### 2. `src/pages/ProjectHome.tsx`
- Pass the same `hideMaterialCards` logic already used for `FinancialSignalBar` to `FinancialHealthCharts`:

```
<FinancialHealthCharts
  financials={financials}
  hideMaterialCards={
    (materialResponsibility === 'GC' && !isSupplier && !isFC && currentOrg?.type !== 'GC') ||
    (materialResponsibility === 'TC' && currentOrg?.type === 'GC')
  }
/>
```

### Files Changed
| File | Change |
|------|--------|
| `src/components/project/FinancialHealthCharts.tsx` | Add `hideMaterialCards` prop, skip material chart when true |
| `src/pages/ProjectHome.tsx` | Pass `hideMaterialCards` to `FinancialHealthCharts` |
