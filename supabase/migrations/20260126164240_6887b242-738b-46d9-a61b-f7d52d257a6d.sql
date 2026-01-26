-- Fix infinite recursion in RLS policy for public.project_participants by removing self-referential subquery

BEGIN;

-- Ensure RLS remains enabled
ALTER TABLE public.project_participants ENABLE ROW LEVEL SECURITY;

-- Drop the problematic policy (references project_participants inside itself)
DROP POLICY IF EXISTS "Project creators can add participants" ON public.project_participants;

-- Recreate a safe INSERT policy that does not reference project_participants
-- Rule: a PM-role user can invite/add participants for projects owned by their org.
CREATE POLICY "Project creators can add participants"
ON public.project_participants
FOR INSERT
TO public
WITH CHECK (
  is_pm_role(auth.uid())
  AND invited_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_participants.project_id
      AND user_in_org(auth.uid(), p.organization_id)
  )
);

COMMIT;