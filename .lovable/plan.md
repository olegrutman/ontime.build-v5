## Sort: action-required COs first

In `src/components/change-orders/COListPage.tsx`, after computing `filteredCOs`, apply a stable sort that floats COs needing the current org's action to the top of every tab (All, Active, Approved, Withdrawn). The "Action" tab is unaffected since it already only contains those.

**Action predicate** (same one used for the Action count):
- `submitted` AND `co.org_id === orgId`, OR
- `closed_for_pricing` AND (`co.org_id === orgId` OR `co.assigned_to_org_id === orgId`), OR
- `work_in_progress` AND `co.assigned_to_org_id === orgId`

**Sort:** action items first, otherwise preserve existing order (which is already newest-first from the query).

```ts
const sortedCOs = useMemo(() => {
  const isAction = (co) => /* predicate above */;
  return [...filteredCOs].sort((a, b) => Number(isAction(b)) - Number(isAction(a)));
}, [filteredCOs, orgId]);
```

Render `sortedCOs` in place of `filteredCOs`. No styling changes, no data changes, no new badges.
