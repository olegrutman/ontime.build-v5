-- ============ Storage access helpers ============
CREATE OR REPLACE FUNCTION public.storage_first_folder_uuid(_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN (storage.foldername(_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN ((storage.foldername(_name))[1])::uuid
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_co_photo_object(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.change_orders co
    WHERE co.id = public.storage_first_folder_uuid(_name)
      AND public.is_project_participant(auth.uid(), co.project_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_daily_log_photo_object(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (storage.foldername(_name))[1] = auth.uid()::text
     OR EXISTS (
       SELECT 1
       FROM public.daily_log_photos p
       JOIN public.daily_logs dl ON dl.id = p.log_id
       WHERE p.storage_path = _name
         AND public.is_project_participant(auth.uid(), dl.project_id)
     );
$$;

CREATE OR REPLACE FUNCTION public.can_access_field_capture_object(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_project_participant(auth.uid(), public.storage_first_folder_uuid(_name));
$$;

REVOKE ALL ON FUNCTION public.storage_first_folder_uuid(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.can_access_co_photo_object(text) FROM anon;
REVOKE ALL ON FUNCTION public.can_access_daily_log_photo_object(text) FROM anon;
REVOKE ALL ON FUNCTION public.can_access_field_capture_object(text) FROM anon;

-- ============ co-photos bucket ============
DROP POLICY IF EXISTS "CO photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own CO photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload CO photos" ON storage.objects;

CREATE POLICY "CO photos viewable by project participants"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'co-photos' AND public.can_access_co_photo_object(name));

CREATE POLICY "CO photos uploadable by project participants"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'co-photos' AND public.can_access_co_photo_object(name));

CREATE POLICY "CO photos deletable by project participants"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'co-photos' AND public.can_access_co_photo_object(name));

-- ============ daily-log-photos bucket ============
DROP POLICY IF EXISTS "Authenticated users can view daily log photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload daily log photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own daily log photos" ON storage.objects;

CREATE POLICY "Daily log photos viewable by project participants"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'daily-log-photos' AND public.can_access_daily_log_photo_object(name));

CREATE POLICY "Daily log photos uploadable by owner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'daily-log-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Daily log photos deletable by owner"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'daily-log-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============ field-captures bucket ============
DROP POLICY IF EXISTS "Authenticated users can view field captures" ON storage.objects;
DROP POLICY IF EXISTS "Public can read field captures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload field captures" ON storage.objects;

CREATE POLICY "Field captures viewable by project participants"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'field-captures' AND public.can_access_field_capture_object(name));

CREATE POLICY "Field captures uploadable by project participants"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'field-captures' AND public.can_access_field_capture_object(name));

CREATE POLICY "Field captures deletable by project participants"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'field-captures' AND public.can_access_field_capture_object(name));

-- ============ invoice_external_invites: remove anon wide-open access ============
DROP POLICY IF EXISTS "Anyone can read invoice invite by token" ON public.invoice_external_invites;
DROP POLICY IF EXISTS "Anyone can respond to invoice invite by token" ON public.invoice_external_invites;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.invoice_external_invites FROM anon;

-- ============ realtime.messages: remove always-true policies ============
DROP POLICY IF EXISTS "Authenticated users can publish realtime presence" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can read realtime messages" ON realtime.messages;

-- ============ co_labor_entries: hide other orgs' rates from field crew ============
DROP POLICY IF EXISTS "Labor entries readable by co participants" ON public.co_labor_entries;
CREATE POLICY "Labor entries readable by co participants"
ON public.co_labor_entries FOR SELECT TO authenticated
USING (
  public.can_see_co_labor_entry(co_id, org_id, is_actual_cost)
  AND (
    public.user_in_org(auth.uid(), org_id)
    OR COALESCE(public.co_viewer_role(co_id), 'none') NOT IN ('fc', 'none')
  )
);

-- ============ fixed search_path on email queue helpers ============
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;

REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;

-- ============ Revoke EXECUTE on SECURITY DEFINER functions ============
-- anon: no signed-out caller needs any definer function (external approval flows
-- run through edge functions using the service role).
-- authenticated: trigger-only functions are never called directly by clients.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig, p.prorettype
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    IF r.prorettype = 'trigger'::regtype THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    END IF;
  END LOOP;
END $$;