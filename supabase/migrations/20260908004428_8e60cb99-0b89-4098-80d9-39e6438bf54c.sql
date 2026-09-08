-- 1. profiles.hourly_rate column-level protection
REVOKE SELECT (hourly_rate) ON public.profiles FROM authenticated;
REVOKE SELECT (hourly_rate) ON public.profiles FROM anon;

CREATE OR REPLACE FUNCTION public.get_my_hourly_rate()
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.hourly_rate FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_my_hourly_rate() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_hourly_rate() TO authenticated;

-- 2. co_labor_entries: FC viewers only see FC-entered rows (blocks rate leak incl. realtime)
DROP POLICY IF EXISTS "Labor entries readable by co participants" ON public.co_labor_entries;
CREATE POLICY "Labor entries readable by co participants"
ON public.co_labor_entries FOR SELECT TO authenticated
USING (
  can_see_co_labor_entry(co_id, org_id, is_actual_cost)
  AND (
    COALESCE(co_viewer_role(co_id), 'none') <> ALL (ARRAY['fc','none'])
    OR (
      user_in_org(auth.uid(), org_id)
      AND upper(COALESCE(entered_by_role, 'FC')) = 'FC'
    )
  )
);

-- 3. notifications: attributable + relationship-scoped inserts
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

CREATE OR REPLACE FUNCTION public.can_notify_user(_recipient_user_id uuid, _recipient_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- same organization as the caller
    EXISTS (
      SELECT 1 FROM public.user_org_roles me
      WHERE me.user_id = auth.uid()
        AND (
          me.organization_id = _recipient_org_id
          OR EXISTS (
            SELECT 1 FROM public.user_org_roles them
            WHERE them.user_id = _recipient_user_id
              AND them.organization_id = me.organization_id
          )
        )
    )
    -- or the recipient (or their org) shares a project with the caller's org
    OR EXISTS (
      SELECT 1
      FROM public.project_participants pp_me
      JOIN public.user_org_roles me ON me.organization_id = pp_me.organization_id AND me.user_id = auth.uid()
      JOIN public.project_participants pp_them ON pp_them.project_id = pp_me.project_id
      WHERE pp_them.organization_id = _recipient_org_id
         OR EXISTS (
           SELECT 1 FROM public.user_org_roles them
           WHERE them.user_id = _recipient_user_id
             AND them.organization_id = pp_them.organization_id
         )
    );
$$;
REVOKE ALL ON FUNCTION public.can_notify_user(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_notify_user(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.stamp_notification_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.stamp_notification_author() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS stamp_notification_author ON public.notifications;
CREATE TRIGGER stamp_notification_author
BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.stamp_notification_author();

DROP POLICY IF EXISTS "Org members or platform staff can create notifications" ON public.notifications;
CREATE POLICY "Related users or platform staff can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  is_platform_staff(auth.uid())
  OR (
    (recipient_user_id IS NOT NULL OR recipient_org_id IS NOT NULL)
    AND public.can_notify_user(recipient_user_id, recipient_org_id)
  )
);

-- 4. project_team: only a CONFIRMED email may claim an invited row
CREATE OR REPLACE FUNCTION public.current_user_verified_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(u.email)
  FROM auth.users u
  WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.current_user_verified_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_verified_email() TO authenticated;

DROP POLICY IF EXISTS "Project creators can update team members" ON public.project_team;
CREATE POLICY "Project creators can update team members"
ON public.project_team FOR UPDATE TO authenticated
USING (
  project_id IN (SELECT p.id FROM public.projects p WHERE p.created_by = auth.uid())
  OR user_id = auth.uid()
  OR (
    invited_email IS NOT NULL
    AND public.current_user_verified_email() IS NOT NULL
    AND lower(invited_email) = public.current_user_verified_email()
  )
);

-- 5. user_org_roles: remove self-insert privilege escalation
DROP POLICY IF EXISTS "Users can insert their own org roles" ON public.user_org_roles;

-- 6. Revoke EXECUTE on internal SECURITY DEFINER routines
REVOKE ALL ON FUNCTION public.sync_contract_on_team_accept() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_po_line_items_recalc_totals() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.anonymize_user_references(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_po_totals(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._co_target_contract_id(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.projects_visible_via_org(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.user_has_read_notification(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_approve_upstream_po(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_project_co_scopes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_project_co_scopes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_approve_upstream_po(uuid, uuid) TO authenticated;