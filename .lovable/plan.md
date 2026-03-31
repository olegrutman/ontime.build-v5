

# Rename Setup → Project Info + Remove Standalone SOV Tab

## Changes

### 1. `ProjectIconRail.tsx`
- Rename `'Project Setup'` label to `'Project Info'`
- Remove the `sov` entry from `GROUP_1`
- Remove `DollarSign` import if unused after removal

### 2. `ProjectSetupFlow.tsx`
- Update the `<h1>` heading from `"Project Setup"` to `"Project Info"`

### 3. `ProjectHome.tsx`
- Remove the `activeTab === 'sov'` rendering block (lines 372-376)
- Remove `ContractSOVEditor` import (it's still used inside `PhaseSOV` via the setup flow)

### Files NOT Changed
- `ContractSOVEditor`, `PhaseSOV`, SOV hooks — all untouched, still used in setup stepper
- Database, types, invoicing — unaffected

