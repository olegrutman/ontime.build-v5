ALTER TABLE public.supplier_estimates
  ADD COLUMN IF NOT EXISTS change_order_id uuid REFERENCES public.change_orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'BASE';

UPDATE public.supplier_estimates SET scope = 'BASE' WHERE scope IS NULL;

ALTER TABLE public.supplier_estimates
  DROP CONSTRAINT IF EXISTS supplier_estimates_scope_check;
ALTER TABLE public.supplier_estimates
  ADD CONSTRAINT supplier_estimates_scope_check CHECK (scope IN ('BASE','CHANGE'));

ALTER TABLE public.supplier_estimates
  DROP CONSTRAINT IF EXISTS supplier_estimates_scope_co_check;
ALTER TABLE public.supplier_estimates
  ADD CONSTRAINT supplier_estimates_scope_co_check CHECK (
    (scope = 'BASE' AND change_order_id IS NULL)
    OR (scope = 'CHANGE' AND change_order_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS supplier_estimates_one_base_per_project
  ON public.supplier_estimates (project_id, supplier_org_id)
  WHERE change_order_id IS NULL AND status <> 'REJECTED';

CREATE UNIQUE INDEX IF NOT EXISTS supplier_estimates_one_per_change_order
  ON public.supplier_estimates (project_id, supplier_org_id, change_order_id)
  WHERE change_order_id IS NOT NULL AND status <> 'REJECTED';

CREATE INDEX IF NOT EXISTS supplier_estimates_change_order_idx
  ON public.supplier_estimates (change_order_id);

CREATE OR REPLACE FUNCTION public.validate_supplier_estimate_change_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.change_order_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.change_orders co
      WHERE co.id = NEW.change_order_id
        AND co.project_id = NEW.project_id
    ) THEN
      RAISE EXCEPTION 'Change order must belong to the same project as the estimate';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_supplier_estimate_change_order ON public.supplier_estimates;
CREATE TRIGGER trg_validate_supplier_estimate_change_order
  BEFORE INSERT OR UPDATE OF change_order_id, project_id ON public.supplier_estimates
  FOR EACH ROW EXECUTE FUNCTION public.validate_supplier_estimate_change_order();