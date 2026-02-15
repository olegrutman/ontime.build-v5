
# Make Operational Summary Tiles Clickable + Add Team Member Button

## Changes

### File: `src/components/project/OperationalSummary.tsx`

**1. Work Orders tile header becomes clickable**
- Make the entire "Recent Work Orders" header area (icon + label) clickable, navigating to the work-orders tab (same as "View All").

**2. Invoices tile header becomes clickable**
- Same treatment for the "Recent Invoices" header -- clicking the title navigates to the invoices tab.

**3. Add "Add Member" button to Team tile**
- Add a `+` or "Add" button in the Team tile header (same position as "View All" on the other tiles).
- Clicking it opens the existing `AddTeamMemberDialog` component.
- Wire up props: `open`, `onOpenChange`, `projectId`, `creatorOrgType` (derived from current user's org type), and `onMemberAdded` (refetches team data).
- Import `AddTeamMemberDialog` and necessary types.
- Add local state for dialog open/close and pass the current user's org type via the `useAuth` hook.

## Technical Details

- `AddTeamMemberDialog` requires `creatorOrgType` (OrgType). This will be obtained from `useAuth().userOrgRoles[0]?.organization?.type`.
- `onMemberAdded` callback will re-fetch the team list by extracting the existing `fetchTeam` logic into a callable function.
- The tile headers for Work Orders and Invoices will be wrapped in a `button` element that calls `onNavigate('work-orders')` and `onNavigate('invoices')` respectively, making the whole header row clickable (not just "View All").
