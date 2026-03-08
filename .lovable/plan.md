

# Fix Platform Project Detail Page — Bugs + Supplier Estimates

## Bugs Found

### Bug 1: Team members query fails (400 error)
The query selects `accepted` but `project_team` has no such column. It has `status` (text: "Accepted"/"Pending"/etc.) and `accepted_at` (timestamp). The team table never loads — always shows "No team members."

**Fix**: Change select from `accepted` to `status, accepted_at` and update the `TeamMember` interface. Use `status === 'Accepted'` for the badge logic.

### Bug 2: Work Orders status breakdown fails (400 error)
Query selects `work_items.status` but the column is `state`.

**Fix**: Change `.select('status')` to `.select('state')` and update `buildCounts` to use `r.state`.

### Bug 3: Team query join may fail
`project_team` FK column is `org_id`. The join `organization:organizations(id, name, type)` may not resolve correctly without specifying the FK hint.

**Fix**: Use `organization:organizations!project_team_org_id_fkey(id, name, type)` or verify the FK name.

### Bug 4: Full address not showing correctly
The address field only has `street`. `city`, `state`, `zip` are top-level project columns, but the code reads them from `project.address`.

**Fix**: Read `city`, `state`, `zip` from the project object directly (they're top-level columns). Add these to `ProjectData` interface.

### Bug 5: No supplier estimates section
The page doesn't show supplier estimates. Need to query `supplier_estimates` for the project and display them.

## Changes — `src/pages/platform/PlatformProjectDetail.tsx`

1. **Fix `ProjectData` interface** — add `city`, `state`, `zip` top-level fields
2. **Fix `TeamMember` interface** — replace `accepted: boolean` with `status: string`
3. **Fix team query** — select `status` instead of `accepted`, add FK hint for org_id
4. **Fix work_items query** — select `state` instead of `status`
5. **Fix address display** — use top-level `city`, `state`, `zip` fields
6. **Fix team accepted badge** — use `t.status === 'Accepted'` instead of `t.accepted`
7. **Add supplier estimates fetch** — query `supplier_estimates` joined with `supplier_org:organizations(name)` for the project
8. **Add Supplier Estimates card** — show estimate name, supplier org, status, total amount, dates

## Single file edit
`src/pages/platform/PlatformProjectDetail.tsx`

