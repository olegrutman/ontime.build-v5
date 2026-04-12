

# Fix: TC Can't See FC in Change Order Wizard

## Root Cause

The `project_participants` table RLS policy "Users can view their participation" only allows reading rows where:
1. You're in the participant's organization, OR
2. You're in the **project owner's** organization (the GC)

Since the TC is not in the GC's org, they can only see their own row. The FC row is invisible to them. That's why the "Select field crew" dropdown is empty.

## The Fix

Add a new RLS SELECT policy that allows any **accepted project participant** to see all other participants in the same project. This is safe — if you're already on the team, you should be able to see who else is on the team.

### Database Migration — New RLS Policy

```sql
CREATE POLICY "Accepted participants can view co-participants"
ON public.project_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.project_participants my
    WHERE my.project_id = project_participants.project_id
      AND my.invite_status = 'ACCEPTED'
      AND user_in_org(auth.uid(), my.organization_id)
  )
);
```

This says: "If you are an accepted participant in this project (via your org), you can see all other participants in the same project."

## Files Changed
- **Database only** — one new RLS policy. No code changes needed.

## What stays the same
- All existing RLS policies remain unchanged
- COWizard query code unchanged — it already queries correctly, RLS was just blocking the results
- TMWOWizard query code unchanged

