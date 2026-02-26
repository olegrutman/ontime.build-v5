

# Notify Admins When a New Join Request is Submitted

## What This Does

When someone requests to join your organization, all admins will:
1. See an in-app notification (bell icon) saying "John Doe has requested to join your organization"
2. Receive an email notification (via the existing email delivery system)
3. See a badge count on the "My Team" sidebar link showing pending join requests

## Technical Changes

### 1. Database Migration

**Add new notification type:**
```sql
ALTER TYPE public.notification_type ADD VALUE 'JOIN_REQUEST';
```

**Create a trigger function** on `org_join_requests` that fires on INSERT when `status = 'pending'`:
- Looks up the requesting user's name from `profiles`
- Looks up the organization name
- Inserts a notification for each admin (`is_admin = true`) in the organization:
  - `type`: `JOIN_REQUEST`
  - `title`: "New Join Request"
  - `body`: "[User Name] has requested to join [Org Name]"
  - `entity_type`: `ORG`
  - `entity_id`: the organization ID
  - `action_url`: `/org-team`
  - `recipient_org_id`: the organization ID
  - `recipient_user_id`: each admin's `user_id`

**Create the trigger:**
```sql
CREATE TRIGGER trg_notify_join_request
  AFTER INSERT ON public.org_join_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_join_request();
```

This automatically triggers the existing email notification pipeline (the `trg_send_notification_email` trigger on the `notifications` table).

### 2. Sidebar Badge -- `src/components/layout/AppSidebar.tsx`

Add a small count badge next to the "My Team" nav link showing the number of pending join requests. This uses a lightweight query:

```sql
SELECT count(*) FROM org_join_requests 
WHERE organization_id = ? AND status = 'pending'
```

Only shown for admin users. The badge disappears when all requests are handled.

### 3. Notification Click Handler -- `src/components/notifications/NotificationItem.tsx`

Ensure that clicking a `JOIN_REQUEST` notification navigates to `/org-team` (the action_url already handles this via the existing routing logic -- just verify no special casing is needed).

## Flow

1. New user submits a join request
2. Database trigger fires, creates notifications for all org admins
3. Email trigger fires on the new notification rows, sending emails to each admin
4. Admins see the bell notification in real-time (existing realtime subscription)
5. Admins see a badge on "My Team" in the sidebar
6. Clicking either takes them to `/org-team` where they can approve/reject

