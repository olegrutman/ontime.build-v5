ALTER TABLE public.field_report_items
  ADD COLUMN IF NOT EXISTS received_quantity numeric,
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS received_by uuid;

CREATE OR REPLACE FUNCTION public.guard_field_receipt_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(current_setting('app.field_receipt', true), '') <> 'on' AND (
     NEW.received_quantity IS DISTINCT FROM OLD.received_quantity OR
     NEW.received_at IS DISTINCT FROM OLD.received_at OR
     NEW.received_by IS DISTINCT FROM OLD.received_by) THEN
    RAISE EXCEPTION 'Use confirm_field_material_receipt to record deliveries';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_field_receipt ON public.field_report_items;
CREATE TRIGGER trg_guard_field_receipt BEFORE UPDATE ON public.field_report_items
FOR EACH ROW EXECUTE FUNCTION public.guard_field_receipt_columns();

CREATE OR REPLACE FUNCTION public.confirm_field_material_receipt(p_item_id uuid, p_quantity numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i record; s public.po_status;
BEGIN
  SELECT * INTO i FROM public.field_report_items WHERE id = p_item_id;
  IF i.id IS NULL OR i.kind <> 'material' OR i.converted_po_id IS NULL THEN RAISE EXCEPTION 'No material order on this item'; END IF;
  IF public.field_report_party(auth.uid(), i.report_id) IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT status INTO s FROM public.purchase_orders WHERE id = i.converted_po_id;
  IF s NOT IN ('ORDERED','READY_FOR_DELIVERY','DELIVERED','FINALIZED') THEN RAISE EXCEPTION 'This order has not been sent to the supplier yet'; END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Enter how many arrived'; END IF;
  PERFORM set_config('app.field_receipt', 'on', true);
  UPDATE public.field_report_items SET received_quantity = p_quantity, received_at = now(), received_by = auth.uid() WHERE id = p_item_id;
  PERFORM set_config('app.field_receipt', 'off', true);
END $$;

REVOKE ALL ON FUNCTION public.confirm_field_material_receipt(uuid, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.confirm_field_material_receipt(uuid, numeric) TO authenticated;