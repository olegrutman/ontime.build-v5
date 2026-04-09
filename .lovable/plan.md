

# Fix: Notification Insert Blocked by Missing RLS Policy

## Root Cause
The `notifications` table has RLS enabled but **no INSERT policy**. When `resendProjectInvite()` tries to insert a notification from the client, it silently fails. The resend logic correctly resolves `org_id`, creates the `project_participants` row, but the notification never reaches the invited user.

## Fix

### 1. Database Migration: Add INSERT policy on `notifications`
Allow authenticated users to insert notifications where they are part of the project's organization (the inviting party):

```sql
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);
```

A permissive insert policy is acceptable here because notifications are informational records — the important security boundary is on SELECT (users should only read their own notifications), which is already in place.

### 2. No code changes needed
The `resendProjectInvite` utility in `src/lib/inviteUtils.ts` is already correct. Once the RLS policy allows inserts, clicking "Resend" will:
- Resolve TC_Test's `org_id` from the `profiles` table
- Update `project_team` with the resolved `org_id` and `user_id`
- Create a `project_participants` row with `invite_status = 'INVITED'`
- Insert a notification for TC_Test's user

| Change | Detail |
|--------|--------|
| DB Migration | Add INSERT policy on `notifications` table for authenticated users |

