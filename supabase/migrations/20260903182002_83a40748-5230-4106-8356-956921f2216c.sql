ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS discontinued_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_time_days integer,
  ADD COLUMN IF NOT EXISTS min_order_qty numeric;

CREATE INDEX IF NOT EXISTS idx_catalog_items_supplier_active
  ON public.catalog_items (supplier_id, is_active, category);

CREATE TABLE IF NOT EXISTS public.catalog_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_item_id uuid NOT NULL UNIQUE REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  list_price numeric NOT NULL CHECK (list_price >= 0),
  price_uom text NOT NULL DEFAULT 'EA',
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalog_prices_supplier ON public.catalog_prices (supplier_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_prices TO authenticated;
GRANT ALL ON public.catalog_prices TO service_role;

ALTER TABLE public.catalog_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers manage own catalog prices"
ON public.catalog_prices FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.suppliers s
  JOIN public.organizations o ON o.id = s.organization_id
  JOIN public.user_org_roles uor ON uor.organization_id = o.id
  WHERE s.id = catalog_prices.supplier_id
    AND uor.user_id = auth.uid()
    AND o.type = 'SUPPLIER'::org_type
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.suppliers s
  JOIN public.organizations o ON o.id = s.organization_id
  JOIN public.user_org_roles uor ON uor.organization_id = o.id
  WHERE s.id = catalog_prices.supplier_id
    AND uor.user_id = auth.uid()
    AND o.type = 'SUPPLIER'::org_type
));

CREATE POLICY "Buyers on shared projects can view catalog prices"
ON public.catalog_prices FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.suppliers s
  WHERE s.id = catalog_prices.supplier_id
    AND public.org_shares_project_with_user(s.organization_id)
));

CREATE TRIGGER trg_catalog_prices_updated_at
BEFORE UPDATE ON public.catalog_prices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();