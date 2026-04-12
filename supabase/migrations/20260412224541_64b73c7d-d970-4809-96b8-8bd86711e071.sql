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