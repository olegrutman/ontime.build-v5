

# Remove Accept/Decline Buttons from Notifications

## Problem
Users can accept/decline project invites from two places: the notification panel and the dashboard attention banner. This creates confusion because:
- The notification panel is for awareness (alerting you something happened)
- The dashboard is where you take action on items requiring your attention
- Having action buttons in both places leads to inconsistent state and a confusing experience

## Best Practice
Following standard UX patterns (e.g., Slack, GitHub, Jira), notifications should **inform and navigate**, not duplicate action surfaces. The single source of truth for accepting/declining should remain the dashboard's attention banner, which already has a polished UI with loading states and contextual information.

## Change

**File: `src/components/notifications/NotificationItem.tsx`**

1. Remove the `useProjectInvite` import and hook usage (lines 19, 55)
2. Remove the `handleAccept` and `handleDecline` functions (lines 68-80)
3. Remove the Accept/Decline button block for `PROJECT_INVITE` notifications (lines 123-144)
4. Add a small hint text for unread project invites: "Go to Dashboard to respond" -- this guides the user to the right place when they click the notification

The notification will still be clickable and navigate to the project page (via `action_url`). The click behavior and all other notification types remain unchanged.

## Technical Details

### What stays the same
- Clicking any notification still navigates to `notification.action_url`
- The dashboard attention banner (`DashboardAttentionBanner`) remains the sole place to accept/decline invites
- The `useProjectInvite` hook and `PendingInvitesPanel` component are untouched

### What changes
- `NotificationItem.tsx`: Remove the invite action buttons, add a subtle "Go to Dashboard to respond" hint for `PROJECT_INVITE` type notifications
- No other files need changes
