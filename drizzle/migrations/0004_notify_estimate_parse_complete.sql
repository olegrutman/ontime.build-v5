ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ESTIMATE_PARSED';

CREATE OR REPLACE FUNCTION public.notify_estimate_parse_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_supplier_org_id uuid;
  v_items int;
BEGIN
  IF NEW.status <> 'completed' OR COALESCE(OLD.status, '') = 'completed' OR NEW.parsed_result IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT se.project_id, se.supplier_org_id INTO v_project_id, v_supplier_org_id
  FROM public.supplier_estimates se
  WHERE se.id = NEW.estimate_id;

  IF v_supplier_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_items := COALESCE((NEW.parsed_result->>'totalItems')::int, 0);

  INSERT INTO public.notifications (
    recipient_org_id, recipient_user_id, type, title, body,
    entity_type, entity_id, action_url, created_by
  ) VALUES (
    v_supplier_org_id,
    NEW.uploaded_by,
    'ESTIMATE_PARSED',
    'Quote read — ready to review',
    v_items || ' items were extracted from ' || COALESCE(NEW.file_name, 'your quote') || '. Review and match them to your catalog.',
    'supplier_estimate',
    NEW.estimate_id,
    '/project/' || v_project_id::text || '/estimates',
    NEW.uploaded_by
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_estimate_parse_complete ON public.estimate_pdf_uploads;
CREATE TRIGGER trg_notify_estimate_parse_complete
AFTER UPDATE ON public.estimate_pdf_uploads
FOR EACH ROW EXECUTE FUNCTION public.notify_estimate_parse_complete();