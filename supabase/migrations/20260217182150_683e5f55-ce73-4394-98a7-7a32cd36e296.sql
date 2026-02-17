-- 1. Add FK from user_org_roles.user_id to profiles.user_id for PostgREST join
ALTER TABLE public.user_org_roles
  ADD CONSTRAINT user_org_roles_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

-- 2. Drop the broken RLS policy on org_invitations that references auth.users
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.org_invitations;

-- 3. Add UPDATE policy so PMs can cancel/expire invitations
CREATE POLICY "PMs can update org invitations"
  ON public.org_invitations
  FOR UPDATE
  USING (user_in_org(auth.uid(), organization_id) AND is_pm_role(auth.uid()))
  WITH CHECK (user_in_org(auth.uid(), organization_id) AND is_pm_role(auth.uid()));