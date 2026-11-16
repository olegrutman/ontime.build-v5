CREATE OR REPLACE FUNCTION public.field_item_notify()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _gc uuid; _url text := '/project/' || NEW.project_id || '/daily-log'; _d text := left(NEW.description, 120);
  _n int; _prefix text := 'field_report_released:' || NEW.report_id || ':';
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'held' THEN
    PERFORM _notify_org_users(NEW.crew_org_id, 'FIELD_ITEM_HELD', 'Field item held',
      _d || ' — Reason: ' || coalesce(NEW.hold_reason,'not given'), 'field_report_item', NEW.id, _url,
      'field_item_held:' || NEW.id || ':' || extract(epoch from now())::bigint);
  ELSIF NEW.status IN ('released','converted') THEN
    FOR _gc IN SELECT DISTINCT organization_id FROM project_participants WHERE project_id = NEW.project_id AND role = 'GC' LOOP
      IF NEW.status = 'released' THEN
        -- One alert per report: fold later releases into the person's unread alert for this report.
        SELECT count(*) INTO _n FROM field_report_items WHERE report_id = NEW.report_id AND status IN ('released','converted') AND released_at IS NOT NULL;
        _n := greatest(_n, 1);
        UPDATE notifications SET body = _n || ' field updates released · latest: ' || _d, created_at = now()
          WHERE recipient_org_id = _gc AND type = 'FIELD_ITEM_RELEASED' AND NOT is_read AND event_key LIKE _prefix || '%';
        IF NOT FOUND THEN
          PERFORM _notify_org_users(_gc, 'FIELD_ITEM_RELEASED', 'Field update released', _d,
            'field_report_item', NEW.id, _url, _prefix || extract(epoch from clock_timestamp())::bigint);
        END IF;
      ELSIF NEW.converted_co_id IS NOT NULL THEN
        PERFORM _notify_org_users(_gc, 'FIELD_ITEM_CONVERTED', 'Field item turned into a work order', _d,
          'change_order', NEW.converted_co_id, '/project/' || NEW.project_id || '/change-orders/' || NEW.converted_co_id,
          'field_item_converted:' || NEW.id);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $function$;