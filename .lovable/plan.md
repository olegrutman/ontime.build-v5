

# Make Recent Documents Clickable

## What
Each row in the "Recent Documents" card on the GC/TC/FC dashboard will be clickable, navigating to the relevant tab in the project page (`/project/:id?tab=invoices` for invoices, `/project/:id?tab=work-orders` for change orders).

## Changes

### 1. Add `projectId` to `RecentDoc` interface
**File:** `src/hooks/useDashboardData.ts`
- Add `projectId: string` to the `RecentDoc` interface.
- Include `projectId: inv.project_id` and `projectId: co.project_id` when building the recent docs list.

### 2. Make rows clickable with navigation
**File:** `src/components/dashboard/DashboardRecentDocs.tsx`
- Import `useNavigate` from `react-router-dom`.
- Add a click handler that navigates to `/project/${doc.projectId}?tab=invoices` for invoices and `/project/${doc.projectId}?tab=work-orders` for change orders.
- Mobile: wrap each row `div` with `onClick` + cursor-pointer styling.
- Desktop: make each `<tr>` clickable with `onClick` + `cursor-pointer` + hover highlight.

| File | Change |
|---|---|
| `src/hooks/useDashboardData.ts` | Add `projectId` to `RecentDoc` interface and data mapping |
| `src/components/dashboard/DashboardRecentDocs.tsx` | Add `useNavigate`, make rows clickable to navigate to project tab |

