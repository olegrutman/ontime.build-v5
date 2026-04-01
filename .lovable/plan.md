

# Fix: Contract Values Not Loading in Setup Page

## Root Cause
**Query key collision** between two components sharing `['project_contracts', projectId]`:

- `ProjectSetupFlow.tsx` line 74: `select('contract_sum')` — only checks if contracts exist
- `PhaseContracts.tsx` line 76: `select('*')` — needs full contract data

React Query caches by key. `ProjectSetupFlow` renders first (parent), caching objects like `{contract_sum: 265000}` with NO `to_project_team_id`, `from_org_id`, etc. When `PhaseContracts` (child) reads the same cache key, it gets these incomplete objects. The initialization effect can't match contracts to team members because all matching fields are undefined → inputs show $0.00.

## Fix

**`src/components/project-setup/ProjectSetupFlow.tsx`** — line 70: Change query key to avoid collision:
```tsx
queryKey: ['project_contracts_exists_check', projectId],
```

This is the only change needed. `PhaseContracts` will then get its own fresh `select('*')` data and correctly populate the inputs.

## Files Modified
| File | Change |
|------|--------|
| `ProjectSetupFlow.tsx` | Rename query key to `project_contracts_exists_check` |

