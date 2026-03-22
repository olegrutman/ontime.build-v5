

# Fix: ProjectContractsPage Team Query

## Problem
`ProjectContractsPage.tsx` queries `project_team` with `profiles:user_id(full_name)` and `organizations:organization_id(name)` — but `project_team` has no foreign key to `profiles` via `user_id`, so the query returns a 400 error. Team members never load, so the contracts page shows "No team members found."

## Fix

**File: `src/pages/ProjectContractsPage.tsx`**

1. Change the query to use columns that actually exist on `project_team`: `id, role, invited_org_name, org_id, status`
2. Update the `TeamMember` interface to match
3. Update the rendering to use `invited_org_name` (like every other component does) instead of `profiles.full_name`

The query becomes:
```ts
supabase
  .from('project_team')
  .select('id, role, invited_org_name, org_id, status')
  .eq('project_id', projectId)
```

Display uses `m.invited_org_name || 'Unknown'` for the name and `m.role` for the role label — matching the pattern in `TeamMembersCard.tsx` and `ProjectTeamSection.tsx`.

## Files changed

| File | Change |
|------|--------|
| `src/pages/ProjectContractsPage.tsx` | Fix query, update interface, update rendering |

