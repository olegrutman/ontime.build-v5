-- Step 1: Create a SECURITY DEFINER helper that checks participation without triggering RLS
CREATE OR REPLACE FUNCTION public.is_project_participant(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_participants pp
    WHERE pp.project_id = _project_id
      AND pp.invite_status = 'ACCEPTED'
      AND public.user_in_org(_user_id, pp.organization_id)
  )
$$;

-- Step 2: Drop the broken recursive policy
DROP POLICY IF EXISTS "Accepted participants can view co-participants" ON public.project_participants;

-- Step 3: Recreate it using the safe helper function
CREATE POLICY "Accepted participants can view co-participants"
ON public.project_participants
FOR SELECT
TO authenticated
USING (public.is_project_participant(auth.uid(), project_id));