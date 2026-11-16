ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'FIELD_REPORT_SUBMITTED';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'FIELD_ITEM_RELEASED';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'FIELD_ITEM_HELD';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'FIELD_ITEM_CONVERTED';

CREATE OR REPLACE FUNCTION public._notify_org_users(_org uuid, _type text, _title text, _body text, _entity_type text, _entity_id uuid, _url text, _key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications(recipient_org_id, recipient_user_id, type, title, body, entity_type, entity_id, action_url, event_key)
  SELECT _org, r.user_id, _type::notification_type, _title, _body, _entity_type, _entity_id, _url, _key || ':' || r.user_id
  FROM (SELECT DISTINCT user_id FROM user_org_roles WHERE organization_id = _org AND user_id IS NOT NULL) r
  WHERE r.user_id IS DISTINCT FROM auth.uid();
END $$;
REVOKE ALL ON FUNCTION public._notify_org_users(uuid,text,text,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.field_report_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _crew text;
BEGIN
  IF NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM 'submitted' AND NEW.reviewer_org_id IS NOT NULL THEN
    SELECT name INTO _crew FROM organizations WHERE id = NEW.crew_org_id;
    PERFORM _notify_org_users(NEW.reviewer_org_id, 'FIELD_REPORT_SUBMITTED',
      'New field report from ' || coalesce(_crew,'your crew'),
      'Report for ' || to_char(NEW.report_date,'Mon DD') || ' is ready for your review.',
      'field_report', NEW.id, '/project/' || NEW.project_id || '/daily-log', 'field_report_submitted:' || NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.field_item_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _gc uuid; _url text := '/project/' || NEW.project_id || '/daily-log'; _d text := left(NEW.description, 120);
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'held' THEN
    PERFORM _notify_org_users(NEW.crew_org_id, 'FIELD_ITEM_HELD', 'Field item held',
      _d || ' — Reason: ' || coalesce(NEW.hold_reason,'not given'), 'field_report_item', NEW.id, _url,
      'field_item_held:' || NEW.id || ':' || extract(epoch from now())::bigint);
  ELSIF NEW.status IN ('released','converted') THEN
    FOR _gc IN SELECT DISTINCT organization_id FROM project_participants WHERE project_id = NEW.project_id AND role = 'GC' LOOP
      IF NEW.status = 'released' THEN
        PERFORM _notify_org_users(_gc, 'FIELD_ITEM_RELEASED', 'Field update released', _d,
          'field_report_item', NEW.id, _url, 'field_item_released:' || NEW.id);
      ELSIF NEW.converted_co_id IS NOT NULL THEN
        PERFORM _notify_org_users(_gc, 'FIELD_ITEM_CONVERTED', 'Field item turned into a work order', _d,
          'change_order', NEW.converted_co_id, '/project/' || NEW.project_id || '/change-orders/' || NEW.converted_co_id,
          'field_item_converted:' || NEW.id);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_field_report_notify ON public.field_reports;
CREATE TRIGGER trg_field_report_notify AFTER UPDATE OF status ON public.field_reports FOR EACH ROW EXECUTE FUNCTION public.field_report_notify();
DROP TRIGGER IF EXISTS trg_field_item_notify ON public.field_report_items;
CREATE TRIGGER trg_field_item_notify AFTER UPDATE OF status ON public.field_report_items FOR EACH ROW EXECUTE FUNCTION public.field_item_notify();