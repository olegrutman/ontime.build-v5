
-- Helper: is this user an admin of the given organization?
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_org_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND COALESCE(is_admin, false) = true
  )
$$;

-- Audit table for sensitive project settings changes
CREATE TABLE IF NOT EXISTS public.project_settings_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES auth.users(id),
  field text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.project_settings_audit TO authenticated;
GRANT ALL ON public.project_settings_audit TO service_role;

ALTER TABLE public.project_settings_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view audit for their projects"
  ON public.project_settings_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_settings_audit.project_id
        AND public.user_in_org(auth.uid(), p.organization_id)
    )
  );

CREATE INDEX IF NOT EXISTS project_settings_audit_project_idx
  ON public.project_settings_audit(project_id, created_at DESC);

-- Trigger: enforce admin-only writes on financial columns + write audit rows
CREATE OR REPLACE FUNCTION public.enforce_project_financial_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_financial_changed boolean := false;
BEGIN
  -- Detect any change to sensitive financial fields
  IF NEW.sales_tax_rate           IS DISTINCT FROM OLD.sales_tax_rate           THEN v_financial_changed := true; END IF;
  IF NEW.labor_taxable            IS DISTINCT FROM OLD.labor_taxable            THEN v_financial_changed := true; END IF;
  IF NEW.tax_jurisdiction_label   IS DISTINCT FROM OLD.tax_jurisdiction_label   THEN v_financial_changed := true; END IF;
  IF NEW.retainage_percent        IS DISTINCT FROM OLD.retainage_percent        THEN v_financial_changed := true; END IF;
  IF NEW.retainage_release_trigger IS DISTINCT FROM OLD.retainage_release_trigger THEN v_financial_changed := true; END IF;
  IF NEW.tc_markup_visibility     IS DISTINCT FROM OLD.tc_markup_visibility     THEN v_financial_changed := true; END IF;

  IF v_financial_changed AND v_uid IS NOT NULL THEN
    v_is_admin := public.is_org_admin(v_uid, OLD.organization_id);
    IF NOT v_is_admin AND NOT public.is_platform_user(v_uid) THEN
      RAISE EXCEPTION 'Only a GC admin can change project financial settings (tax, retainage, markup disclosure).'
        USING ERRCODE = '42501';
    END IF;

    -- Write audit rows only for the fields that actually changed
    IF NEW.sales_tax_rate IS DISTINCT FROM OLD.sales_tax_rate THEN
      INSERT INTO public.project_settings_audit(project_id, changed_by, field, old_value, new_value)
      VALUES (NEW.id, v_uid, 'sales_tax_rate', OLD.sales_tax_rate::text, NEW.sales_tax_rate::text);
    END IF;
    IF NEW.labor_taxable IS DISTINCT FROM OLD.labor_taxable THEN
      INSERT INTO public.project_settings_audit(project_id, changed_by, field, old_value, new_value)
      VALUES (NEW.id, v_uid, 'labor_taxable', OLD.labor_taxable::text, NEW.labor_taxable::text);
    END IF;
    IF NEW.tax_jurisdiction_label IS DISTINCT FROM OLD.tax_jurisdiction_label THEN
      INSERT INTO public.project_settings_audit(project_id, changed_by, field, old_value, new_value)
      VALUES (NEW.id, v_uid, 'tax_jurisdiction_label', OLD.tax_jurisdiction_label, NEW.tax_jurisdiction_label);
    END IF;
    IF NEW.retainage_percent IS DISTINCT FROM OLD.retainage_percent THEN
      INSERT INTO public.project_settings_audit(project_id, changed_by, field, old_value, new_value)
      VALUES (NEW.id, v_uid, 'retainage_percent', OLD.retainage_percent::text, NEW.retainage_percent::text);
    END IF;
    IF NEW.retainage_release_trigger IS DISTINCT FROM OLD.retainage_release_trigger THEN
      INSERT INTO public.project_settings_audit(project_id, changed_by, field, old_value, new_value)
      VALUES (NEW.id, v_uid, 'retainage_release_trigger', OLD.retainage_release_trigger, NEW.retainage_release_trigger);
    END IF;
    IF NEW.tc_markup_visibility IS DISTINCT FROM OLD.tc_markup_visibility THEN
      INSERT INTO public.project_settings_audit(project_id, changed_by, field, old_value, new_value)
      VALUES (NEW.id, v_uid, 'tc_markup_visibility', OLD.tc_markup_visibility, NEW.tc_markup_visibility);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_project_financial_admin ON public.projects;
CREATE TRIGGER trg_enforce_project_financial_admin
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_project_financial_admin();
