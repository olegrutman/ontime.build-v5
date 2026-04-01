

# Fix: My Team and My Partners Cards Not Visible on Dashboard

## Root Cause

Two issues:

1. **Cards are below the fold** — They render after Budget, Activity, Needs Attention, and Reminders in the right column, pushing them off-screen.

2. **Partners query uses wrong table** — `DashboardPartnersCard` queries `project_participants` but the app's partner logic (see `usePartnerDirectory.ts`) uses `project_team` table. The `project_participants` query likely returns data that doesn't include partners from the current user's shared projects — it fetches ALL non-self participants globally rather than scoping to shared projects first. The existing `usePartnerDirectory.ts` hook already solves this correctly by first getting the user's projects from `project_team`, then finding other orgs on those projects.

3. **Team card foreign key hint may fail** — The query uses `profiles!user_org_roles_user_id_fkey` which may not match the actual FK constraint name, causing a silent PostgREST error.

## Fix

### 1. Reorder right column — move Team & Partners higher
**File**: `src/pages/Dashboard.tsx`

New order:
```
Budget → Team → Partners → Activity (collapsed) → Needs Attention → Reminders
```

### 2. Fix Partners card query — use `project_team` table
**File**: `src/components/dashboard/DashboardPartnersCard.tsx`

Replace `project_participants` query with the same approach as `usePartnerDirectory.ts`:
- First fetch the user's projects from `project_team` where `org_id = currentOrgId` and `status = 'Accepted'`
- Then fetch other orgs on those same projects from `project_team` where `org_id != currentOrgId`
- Join with `organizations` to get name and type

### 3. Fix Team card query — remove fragile FK hint
**File**: `src/components/dashboard/DashboardTeamCard.tsx`

Replace the FK-hinted join with a simpler two-step approach or use the correct FK name. Also add error logging so silent failures are visible.

## Files Modified
| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Reorder right column: Team + Partners above Activity |
| `src/components/dashboard/DashboardPartnersCard.tsx` | Rewrite query to use `project_team` table (matching `usePartnerDirectory.ts` pattern) |
| `src/components/dashboard/DashboardTeamCard.tsx` | Fix FK hint or use two-step query; add error logging |

