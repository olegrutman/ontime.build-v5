

# Fix: Pass `orgId` Through to Stats Hook + Console Warning

## Problems Found

1. **`orgId` never reaches the stats hook (HIGH)** -- `Dashboard.tsx` has `orgId` on line 54, but it is never passed to `DashboardProjectList`, which never passes it to `ProjectRow`, which calls `useProjectQuickStats` without it. All the org-based filtering logic added in the previous fix (contracts, invoices, WOs, POs) is dead code -- it never runs because `orgId` is always `undefined`.

2. **Console ref warning on KpiTile (LOW)** -- React warns "Function components cannot be given refs" for `KpiTile`. This is likely caused by the spread `{...tile}` in the rendering loop unintentionally passing a ref. Not a functional bug but noisy in console.

## Changes

### 1. Pass `orgId` through the chain

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Add `orgId={orgId}` prop to `<DashboardProjectList>` |
| `src/components/dashboard/DashboardProjectList.tsx` | Accept `orgId` prop, pass it to `<ProjectRow>` |
| `src/components/dashboard/ProjectRow.tsx` | Accept `orgId` prop, pass it to `useProjectQuickStats` options |

Line 76 in `ProjectRow.tsx` changes from:
```typescript
const stats = useProjectQuickStats(isExpanded ? project.id : null, { orgType: orgType ?? undefined });
```
to:
```typescript
const stats = useProjectQuickStats(isExpanded ? project.id : null, { orgType: orgType ?? undefined, orgId: orgId ?? undefined });
```

### 2. Fix KpiTile ref warning

The `KpiTile` component at line 158 of `ProjectQuickOverview.tsx` should not receive a ref. The issue is that the iteration uses spread which may pass unintended props. Will ensure only named props are passed (already seems correct in the code shown -- may need to verify the exact rendering line).

