

# Fix: Project Invite Link Doesn't Work

## Problem

When an invited user clicks the notification link or email link for a project invite, they are sent to `/project/{id}`. But since they haven't accepted the invite yet, RLS blocks them from reading the `projects` table row. The fetch fails silently, and `ProjectHome.tsx` redirects them to `/dashboard` with no explanation.

The accept/decline UI only exists on the Dashboard (`PendingInvitesPanel`), but the user never knows to look there.

## Root Cause

- `ProjectHome.tsx` line 202: queries `projects` table directly — RLS denies access to non-participants
- Line 203: on error, silently redirects to `/dashboard`
- The notification `action_url` is `/project/{project_id}` — a page the invited user cannot access

## Plan

### 1. Change notification `action_url` for PROJECT_INVITE to `/dashboard`

Update the `notify_project_invite` trigger function so the `action_url` for `PROJECT_INVITE` notifications points to `/dashboard` instead of `/project/{id}`. The dashboard already has the `PendingInvitesPanel` with accept/decline buttons.

Database migration:
```sql
CREATE OR REPLACE FUNCTION public.notify_project_invite() ...
  -- Change: action_url from '/project/' || NEW.project_id to '/dashboard'
```

### 2. Show inline invite banner in ProjectHome when access is denied

In `ProjectHome.tsx`, when the project fetch fails, check if the user has a pending invite for this project (query `project_participants` where `invite_status = 'INVITED'`). If yes, show an accept/decline card instead of silently redirecting. If no pending invite, then redirect to dashboard as before.

This handles direct URL visits and old cached notification links.

### 3. Update NotificationItem to route PROJECT_INVITE to dashboard

In `NotificationItem.tsx`, override `action_url` for `PROJECT_INVITE` type notifications to always navigate to `/dashboard`, regardless of what the stored `action_url` says. This fixes existing notifications that already have `/project/{id}` as their action URL.

## Files to Change

| File | Change |
|---|---|
| Database migration | Update `notify_project_invite` trigger: `action_url` = `/dashboard` for `PROJECT_INVITE` |
| `src/pages/ProjectHome.tsx` | On project fetch error, check for pending invite before redirecting; show accept/decline UI if found |
| `src/components/notifications/NotificationItem.tsx` | Override navigation for `PROJECT_INVITE` to go to `/dashboard` |

