

# Bug: TC Can't Accept GC's Project Invite on Dashboard

## Problem

The dashboard shows pending project invitations in the "Needs Attention" card with a "Respond" badge. But clicking an invite item just navigates to `/dashboard` — the same page the user is already on. There are **no accept/decline buttons** anywhere on the dashboard.

The `PendingInvitesPanel` component (which has accept/decline buttons) exists in `src/components/dashboard/PendingInvitesPanel.tsx` but is **never rendered** on the Dashboard page. The `DashboardAttentionBanner` also has inline accept/decline logic but is also unused.

## Fix

Modify `DashboardNeedsAttentionCard` to render inline **Accept / Decline** buttons for invite items instead of a plain navigation link. This gives the TC user a way to actually respond to the invite without leaving the dashboard.

### Changes

| File | Change |
|---|---|
| `src/components/dashboard/DashboardNeedsAttentionCard.tsx` | Add `useProjectInvite` hook, render Accept/Decline buttons for invite-type items, call `onRefresh` callback after action |
| `src/pages/Dashboard.tsx` | Pass `onRefresh={refetch}` prop to `DashboardNeedsAttentionCard` |

### Detail

In `DashboardNeedsAttentionCard`:
- Import `useProjectInvite` and add local state for processing
- For invite items, replace the clickable row with a row that has two small buttons (Accept / Decline)
- On accept/decline success, call the `onRefresh` callback to re-fetch dashboard data
- Keep the existing click-to-navigate behavior for non-invite items (change orders, invoices)

