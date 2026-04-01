

# Fix: Contract Label Swaps, Broken Navigation, and Missing SOV Tab

## Issues Found

| # | Bug | Location |
|---|-----|----------|
| 1 | Contract role labels (GC/TC) are swapped — org names show next to wrong role abbreviation | `OverviewContractsSection.tsx` |
| 2 | `getContractDisplayName()` displays `TO → FROM` instead of `FROM → TO` | `useContractSOV.ts` line 143 |
| 3 | Clicking contract card navigates to `sov` tab but no content renders (blank page) | `ProjectHome.tsx` — missing `activeTab === 'sov'` block |
| 4 | SOV tab missing from desktop icon rail sidebar | `ProjectIconRail.tsx` — no SOV entry |

## Root Causes

**Labels (Bug 1)**: `OverviewContractsSection` hardcodes `fromRole: 'GC', toRole: 'TC'` regardless of the actual `from_role`/`to_role` values on the contract record. The upstream contract filter in `useProjectFinancials` accepts both `GC→TC` and `TC→GC` orderings, so the contract could have either direction. The fix is to read `from_role`/`to_role` from the contract itself.

**Display name (Bug 2)**: `getContractDisplayName` returns `${to} → ${from}` which is backwards.

**Navigation (Bugs 3-4)**: SOV exists as a standalone page (`ProjectSOVPage`) but was never integrated into the `ProjectHome` tab system. No render block exists and it's not in the icon rail.

## Fixes

### 1. `OverviewContractsSection.tsx` — Use actual contract roles
Instead of hardcoding `fromRole: 'GC'`, read from the contract data:
```tsx
fromRole: upstreamContract.from_role === 'General Contractor' ? 'GC' : 
          upstreamContract.from_role === 'Trade Contractor' ? 'TC' : 'FC',
```
Apply the same pattern for all rows.

### 2. `useContractSOV.ts` — Fix display name direction
Line 143: Change `${to} → ${from}` to `${from} → ${to}`.

### 3. `ProjectHome.tsx` — Add SOV tab rendering
Add a block for `activeTab === 'sov'`:
```tsx
{activeTab === 'sov' && (
  <ContractSOVEditor projectId={id!} />
)}
```
`ContractSOVEditor` is already imported on line 46.

### 4. `ProjectIconRail.tsx` — Add SOV to sidebar
Add SOV entry to GROUP_2 (between Setup and Change Orders) with `DollarSign` icon and `featureKey: 'sov_contracts'`.

## Files Modified
| File | Change |
|------|--------|
| `src/components/project/OverviewContractsSection.tsx` | Read `from_role`/`to_role` from contract data instead of hardcoding |
| `src/hooks/useContractSOV.ts` | Fix `getContractDisplayName` — swap `${to} → ${from}` to `${from} → ${to}` |
| `src/pages/ProjectHome.tsx` | Add `activeTab === 'sov'` render block using existing `ContractSOVEditor` |
| `src/components/project/ProjectIconRail.tsx` | Add SOV item to icon rail GROUP_2 |

