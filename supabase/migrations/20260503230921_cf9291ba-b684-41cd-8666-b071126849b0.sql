
CREATE TABLE public.co_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  co_id uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  source_table text NOT NULL DEFAULT 'change_orders',
  source_row_id uuid,
  actor_user_id uuid,
  actor_role text,
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_co_audit_log_co_id ON public.co_audit_log(co_id);
CREATE INDEX idx_co_audit_log_changed_at ON public.co_audit_log(changed_at);

ALTER TABLE public.co_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view audit log"
  ON public.co_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.change_orders co
      WHERE co.id = co_audit_log.co_id
        AND public.is_project_participant(auth.uid(), co.project_id)
    )
  );

-- Trigger function for change_orders
CREATE OR REPLACE FUNCTION public.audit_change_orders_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fields text[] := ARRAY['tc_submitted_price','gc_budget','nte_cap','status','pricing_type','assigned_to_org_id','materials_responsible','equipment_responsible'];
  f text; old_val jsonb; new_val jsonb;
BEGIN
  FOREACH f IN ARRAY fields LOOP
    EXECUTE format('SELECT to_jsonb(($1).%I), to_jsonb(($2).%I)', f, f) INTO old_val, new_val USING OLD, NEW;
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO co_audit_log (co_id, source_table, source_row_id, field_name, old_value, new_value)
      VALUES (NEW.id, 'change_orders', NEW.id, f, old_val, new_val);
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_audit_change_orders AFTER UPDATE ON public.change_orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_change_orders_changes();

-- Trigger function for co_line_items
CREATE OR REPLACE FUNCTION public.audit_co_line_items_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fields text[] := ARRAY['pricing_type','nte_cap'];
  f text; old_val jsonb; new_val jsonb;
BEGIN
  FOREACH f IN ARRAY fields LOOP
    EXECUTE format('SELECT to_jsonb(($1).%I), to_jsonb(($2).%I)', f, f) INTO old_val, new_val USING OLD, NEW;
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO co_audit_log (co_id, source_table, source_row_id, field_name, old_value, new_value)
      VALUES (NEW.co_id, 'co_line_items', NEW.id, f, old_val, new_val);
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_audit_co_line_items AFTER UPDATE ON public.co_line_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_co_line_items_changes();

-- Trigger function for co_labor_entries
CREATE OR REPLACE FUNCTION public.audit_co_labor_entries_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fields text[] := ARRAY['hours','hourly_rate','lump_sum','line_total'];
  f text; old_val jsonb; new_val jsonb; v_co_id uuid;
BEGIN
  SELECT co_id INTO v_co_id FROM co_line_items WHERE id = NEW.co_line_item_id;
  IF v_co_id IS NULL THEN RETURN NEW; END IF;
  FOREACH f IN ARRAY fields LOOP
    EXECUTE format('SELECT to_jsonb(($1).%I), to_jsonb(($2).%I)', f, f) INTO old_val, new_val USING OLD, NEW;
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO co_audit_log (co_id, source_table, source_row_id, field_name, old_value, new_value)
      VALUES (v_co_id, 'co_labor_entries', NEW.id, f, old_val, new_val);
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_audit_co_labor_entries AFTER UPDATE ON public.co_labor_entries
  FOR EACH ROW EXECUTE FUNCTION public.audit_co_labor_entries_changes();
