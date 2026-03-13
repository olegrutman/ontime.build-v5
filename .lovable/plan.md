
Goal: make project invites actionable for Supplier users on the Supplier Dashboard.

Why this is happening:
- Supplier users are routed to a separate dashboard component (`SupplierDashboard`).
- Invite accept/decline UI exists on the standard dashboard cards/panels, but not inside `SupplierDashboard`.
- Notification clicks for project invites route to `/dashboard`, so Supplier users land on a page with no project-invite actions.

Implementation plan:

1) Wire pending project invites into Supplier Dashboard
- File: `src/pages/Dashboard.tsx`
- Change supplier branch from:
  - `return <SupplierDashboard />`
- To:
  - `return <SupplierDashboard pendingInvites={pendingInvites} onRefreshInvites={refetch} />`
- This reuses already-fetched invite data (no new backend query needed).

2) Render invite response UI inside Supplier Dashboard
- File: `src/components/dashboard/SupplierDashboard.tsx`
- Add props for `pendingInvites` and `onRefreshInvites`.
- Reuse existing `PendingInvitesPanel` so Supplier users get working Accept/Decline buttons immediately.
- Place the panel near the top (right under `OrgInviteBanner`) so invite actions are visible first.
- On accept/decline success, call `onRefreshInvites` (and optionally local supplier refetch) so the card clears instantly.

3) Keep behavior consistent with current invite routing
- No backend migration needed.
- Existing notification routing to `/dashboard` remains correct because Supplier Dashboard will now include the invite actions.

Technical details:
- Reused components/hooks:
  - `useDashboardData` (already provides `pendingInvites` + `refetch`)
  - `PendingInvitesPanel` (already uses `useProjectInvite` RPCs)
- Files touched:
  - `src/pages/Dashboard.tsx`
  - `src/components/dashboard/SupplierDashboard.tsx`
- No schema/RLS/function changes required.

Validation checklist (end-to-end):
1. Log in as Supplier with a pending project invite.
2. Open `/dashboard` and confirm “Project Invitations” section appears.
3. Click Accept → invitation disappears after refresh and access to `/project/:id` works.
4. Re-test with Decline → invitation disappears and project access is denied.
5. Verify non-supplier dashboard behavior is unchanged.
