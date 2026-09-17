-- The participant view policy ignored per-member project scope, so members set to
-- "Assigned projects only" could still see every project their company participates in.
-- can_see_project() already covers the participant path for org-scope members and admins,
-- so this policy is redundant except for the leak it creates.
DROP POLICY IF EXISTS "Participants can view invited projects" ON public.projects;

CREATE POLICY "Participants can view invited projects"
ON public.projects
FOR SELECT
USING (public.user_is_project_participant(auth.uid(), id) AND public.can_see_project(id));