CREATE OR REPLACE FUNCTION public.guard_project_info_creator() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_creator uuid; v_changed boolean := true;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'projects' THEN
    v_creator := OLD.created_by;
    v_changed := (to_jsonb(NEW) - ARRAY['updated_at','status','organization_id','setup_completion_required']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['updated_at','status','organization_id','setup_completion_required']);
  ELSIF TG_TABLE_NAME = 'project_contracts' THEN
    v_creator := OLD.created_by_user_id;
    -- Approval rollups update contract sums from trusted nested triggers, not direct edits.
    IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
    v_changed := NEW.contract_sum IS DISTINCT FROM OLD.contract_sum OR NEW.retainage_percent IS DISTINCT FROM OLD.retainage_percent OR NEW.material_responsibility IS DISTINCT FROM OLD.material_responsibility OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id;
  ELSE
    SELECT created_by INTO v_creator FROM public.projects WHERE id = NEW.project_id;
    IF TG_OP = 'UPDATE' AND NEW.project_id IS DISTINCT FROM OLD.project_id THEN
      RAISE EXCEPTION 'Project information cannot be moved to another project' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF v_changed AND v_creator IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the creator can edit this project information or contract pricing' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_project_info_creator() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER project_info_creator_guard BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.guard_project_info_creator();
CREATE TRIGGER project_scope_creator_guard BEFORE INSERT OR UPDATE ON public.project_scope_details FOR EACH ROW EXECUTE FUNCTION public.guard_project_info_creator();
CREATE TRIGGER project_answers_creator_guard BEFORE INSERT OR UPDATE ON public.project_setup_answers FOR EACH ROW EXECUTE FUNCTION public.guard_project_info_creator();
CREATE TRIGGER contract_info_creator_guard BEFORE UPDATE ON public.project_contracts FOR EACH ROW EXECUTE FUNCTION public.guard_project_info_creator();