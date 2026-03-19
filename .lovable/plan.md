

## Fix: TC cannot see "Request FC input" button on CO detail

**Root cause** (line 116 of `CODetailPage.tsx`):
```
canRequestFCInput = isTC && co.created_by_role === 'GC' && status in ('shared','rejected')
```

Two problems:
1. `combined` status is missing -- combined COs are a valid working state for TC
2. The `created_by_role === 'GC'` restriction is too narrow -- TC should be able to request FC input on any CO they are the assigned party for, regardless of who created it

**Fix in `CODetailPage.tsx` (line 116)**:
- Change the condition to:
  - `isTC`
  - `co.assigned_to_org_id === myOrgId` (TC is the assigned party)
  - status is `shared`, `rejected`, OR `combined`
  - Remove the `created_by_role === 'GC'` restriction

**No other files need changes** -- the RLS migration already covers `combined` status, the `FCInputRequestCard` component is already wired up, and the RPC functions work regardless of `created_by_role`.

