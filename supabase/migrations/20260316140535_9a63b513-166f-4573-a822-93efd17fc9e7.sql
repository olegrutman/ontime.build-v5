
-- Migration 4: work_order_line_items table
CREATE TABLE public.work_order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  change_order_id UUID REFERENCES public.change_order_projects(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  created_by_user_id UUID NOT NULL,
  catalog_item_id UUID REFERENCES public.work_order_catalog(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  division TEXT,
  category_name TEXT,
  group_label TEXT,
  unit TEXT NOT NULL,
  qty DECIMAL,
  hours DECIMAL,
  unit_rate DECIMAL NOT NULL,
  line_total DECIMAL NOT NULL DEFAULT 0,
  material_spec TEXT,
  location_tag TEXT,
  note TEXT,
  period_week DATE NOT NULL DEFAULT (date_trunc('week', now()))::date,
  status TEXT NOT NULL DEFAULT 'draft',
  added_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to compute line_total
CREATE OR REPLACE FUNCTION public.compute_wo_line_item_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.line_total := COALESCE(NEW.qty, NEW.hours, 0) * COALESCE(NEW.unit_rate, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wo_line_item_total
  BEFORE INSERT OR UPDATE ON public.work_order_line_items
  FOR EACH ROW EXECUTE FUNCTION public.compute_wo_line_item_total();

-- RLS
ALTER TABLE public.work_order_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project participants can view line items"
  ON public.work_order_line_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_team pt
      WHERE pt.project_id = work_order_line_items.project_id
        AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can insert line items"
  ON public.work_order_line_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_org_roles uor
      WHERE uor.organization_id = work_order_line_items.org_id
        AND uor.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator can update own line items"
  ON public.work_order_line_items FOR UPDATE TO authenticated
  USING (created_by_user_id = auth.uid());

CREATE POLICY "Creator can delete own line items"
  ON public.work_order_line_items FOR DELETE TO authenticated
  USING (created_by_user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.work_order_line_items;
