
-- 1. New columns on change_orders
ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS gc_budget numeric,
  ADD COLUMN IF NOT EXISTS co_material_responsible_override text,
  ADD COLUMN IF NOT EXISTS co_equipment_responsible_override text;

-- 2. New columns on co_labor_entries
ALTER TABLE public.co_labor_entries
  ADD COLUMN IF NOT EXISTS gc_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gc_approved_at timestamptz;

-- 3. New columns on change_order_collaborators
ALTER TABLE public.change_order_collaborators
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

-- 4. New table co_sov_items
CREATE TABLE IF NOT EXISTS public.co_sov_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  co_id uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  line_item_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  invoice_id uuid
);

-- Enable RLS
ALTER TABLE public.co_sov_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for co_sov_items
CREATE POLICY "Users can view co_sov_items for their org"
  ON public.co_sov_items FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert co_sov_items for their org"
  ON public.co_sov_items FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update co_sov_items for their org"
  ON public.co_sov_items FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete co_sov_items for their org"
  ON public.co_sov_items FOR DELETE TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_co_sov_items_co_id ON public.co_sov_items(co_id);
CREATE INDEX IF NOT EXISTS idx_co_sov_items_org_id ON public.co_sov_items(org_id);
