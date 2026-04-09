

# Fix Contract Creation Error + Team Invitation Method

## Problem

1. **Contract insert fails** with `project_contracts_from_role_check` constraint violation. The wizard saves `from_role: 'TC_PM'` but the constraint only allows `'General Contractor'`, `'Trade Contractor'`, or `'Field Crew'`.

2. **Contract insert is missing required fields** — no `from_org_id` or `to_org_id` are set, and the role values don't match the established pattern used in `EditProject.tsx`.

## Fix

### `src/hooks/useSetupWizardV2.ts` — Fix contract insert (lines ~1060-1068)

The contract insert currently uses hardcoded invalid values:
```ts
from_role: 'TC_PM',   // INVALID — fails check constraint
to_role: 'GC_PM',     // INVALID
trade: 'Framing',     // Hardcoded — wrong
```

Change to use the actual creator org context. The `saveAll` method needs to accept the creator's org ID and org type so it can set proper `from_org_id`, `from_role`, and leave `to_org_id`/`to_role` null (no counterparty yet — same pattern as `EditProject.tsx`):

```ts
// For a TC creator:
from_org_id: creatorOrgId,
from_role: 'Trade Contractor',
to_org_id: null,
to_role: null,
trade: null,

// For a GC creator:
from_org_id: creatorOrgId,
from_role: 'General Contractor',
to_org_id: null,
to_role: null,
trade: null,
```

### `src/pages/CreateProjectNew.tsx` — Pass org context to saveAll

Update the `wizard.saveAll(pid)` call to pass `currentOrg.id` and `currentOrg.type` so the hook can build the correct contract payload. The team member saving code (project_team + project_invites) is already using the correct invitation pattern — no changes needed there.

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Fix contract insert to use proper `from_org_id`, `from_role` based on creator org; accept org context in `saveAll` |
| `src/pages/CreateProjectNew.tsx` | Pass `currentOrg.id` and `currentOrg.type` to `wizard.saveAll()` |

