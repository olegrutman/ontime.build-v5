

# Allow TC (Project Creator) to Enter GC Contract Price and Retainage

## Problem
When a TC creates a project and adds a GC team member, the ProjectContractsPage shows the GC in the filtered team list but:
1. The contract sum input works (since `isFromCreatorOrg` is true for TC creator), but there's no retainage field anywhere on this page
2. The save logic doesn't persist `retainage_percent`
3. The ScopeDetailsTab "Edit" button is also gated by `isFromCreatorOrg` which is correct for TC creators

## Changes

### `src/pages/ProjectContractsPage.tsx`

1. **Add retainage state** — a parallel `Record<string, string>` for retainage percentages, initialized from `existingContracts` just like contract sums

2. **Add retainage input** — for each team member row, add a retainage % input field next to the contract sum input. Same disabled logic as the contract sum field.

3. **Save retainage** — include `retainage_percent` in both the `.update()` and `.insert()` calls

### Layout per team member row
```
[Org Name]          [$  contract sum ]  [  retainage %  ]
[Role label]
```

Retainage input: number field with `%` suffix, placeholder "0", `step="0.5"`, width ~24 (w-24).

### Files to modify
| File | Change |
|------|--------|
| `src/pages/ProjectContractsPage.tsx` | Add `retainages` state, retainage input per row, persist `retainage_percent` on save |

