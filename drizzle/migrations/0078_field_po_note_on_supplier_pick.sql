CREATE OR REPLACE FUNCTION public.guard_field_po_supplier()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- A real supplier was picked: drop the "no supplier yet" reminder from the note.
  IF OLD.supplier_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
     AND NEW.supplier_id <> 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
     AND coalesce(NEW.notes,'') LIKE '%No supplier on this project yet%' THEN
    NEW.notes := 'From crew field report.';
  END IF;
  IF OLD.status = 'ACTIVE' AND NEW.status <> 'ACTIVE'
     AND NEW.supplier_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
     AND coalesce(NEW.notes,'') LIKE '%No supplier on this project yet%' THEN
    RAISE EXCEPTION 'Choose a supplier for this order before sending it';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_field_po_supplier ON public.purchase_orders;
CREATE TRIGGER trg_guard_field_po_supplier BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_field_po_supplier();