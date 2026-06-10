
CREATE TEMP TABLE _orphan_user_ids ON COMMIT DROP AS
SELECT p.user_id
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE u.id IS NULL;

DELETE FROM public.member_permissions
WHERE user_org_role_id IN (
  SELECT id FROM public.user_org_roles
  WHERE user_id IN (SELECT user_id FROM _orphan_user_ids)
);

DELETE FROM public.user_org_roles
WHERE user_id IN (SELECT user_id FROM _orphan_user_ids);

DELETE FROM public.platform_users
WHERE user_id IN (SELECT user_id FROM _orphan_user_ids);

DELETE FROM public.profiles
WHERE user_id IN (SELECT user_id FROM _orphan_user_ids);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.profiles'::regclass AND conname='profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
DECLARE s RECORD; largest_id uuid; residue numeric;
BEGIN
  FOR s IN
    SELECT sov_id, ROUND(SUM(percent_of_contract)::numeric, 2) AS pct_sum
    FROM public.project_sov_items
    GROUP BY sov_id
    HAVING ROUND(SUM(percent_of_contract)::numeric, 2) <> 100.00
  LOOP
    residue := s.pct_sum - 100.00;
    SELECT id INTO largest_id FROM public.project_sov_items
      WHERE sov_id = s.sov_id ORDER BY percent_of_contract DESC LIMIT 1;
    UPDATE public.project_sov_items
       SET percent_of_contract = percent_of_contract - residue
     WHERE id = largest_id;
  END LOOP;
END $$;

UPDATE public.project_schedule_items psi
   SET created_by = p.created_by
  FROM public.projects p
 WHERE psi.created_by IS NULL
   AND psi.project_id = p.id
   AND p.created_by IS NOT NULL;

ALTER TABLE public.organizations ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE public.project_team ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.project_designated_suppliers ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.co_scope_evidence ALTER COLUMN created_by SET NOT NULL;
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.project_schedule_items WHERE created_by IS NULL) = 0 THEN
    ALTER TABLE public.project_schedule_items ALTER COLUMN created_by SET NOT NULL;
  END IF;
END $$;

DO $$
DECLARE f RECORD;
BEGIN
  FOR f IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon', f.proname, f.args);
  END LOOP;
END $$;
