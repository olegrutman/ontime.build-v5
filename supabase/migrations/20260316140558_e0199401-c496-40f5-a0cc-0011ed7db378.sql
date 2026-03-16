
-- Fix search_path on the trigger function
CREATE OR REPLACE FUNCTION public.compute_wo_line_item_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.line_total := COALESCE(NEW.qty, NEW.hours, 0) * COALESCE(NEW.unit_rate, 0);
  RETURN NEW;
END;
$$;

-- Migration 5: work_order_materials and work_order_equipment tables

CREATE TABLE public.work_order_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  change_order_id UUID REFERENCES public.change_order_projects(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  created_by_user_id UUID NOT NULL,
  description TEXT NOT NULL,
  supplier TEXT,
  quantity DECIMAL NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'ea',
  unit_cost DECIMAL NOT NULL,
  line_cost DECIMAL NOT NULL DEFAULT 0,
  markup_percent DECIMAL NOT NULL DEFAULT 0,
  markup_amount DECIMAL NOT NULL DEFAULT 0,
  billed_amount DECIMAL NOT NULL DEFAULT 0,
  added_by_role TEXT NOT NULL,
  receipt_note TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  added_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.work_order_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  change_order_id UUID REFERENCES public.change_order_projects(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  created_by_user_id UUID NOT NULL,
  description TEXT NOT NULL,
  duration_note TEXT,
  cost DECIMAL NOT NULL,
  markup_percent DECIMAL NOT NULL DEFAULT 0,
  markup_amount DECIMAL NOT NULL DEFAULT 0,
  billed_amount DECIMAL NOT NULL DEFAULT 0,
  added_by_role TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  added_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger for materials
CREATE OR REPLACE FUNCTION public.compute_wo_material_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.line_cost := COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_cost, 0);
  NEW.markup_amount := NEW.line_cost * COALESCE(NEW.markup_percent, 0) / 100;
  NEW.billed_amount := NEW.line_cost + NEW.markup_amount;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wo_material_totals
  BEFORE INSERT OR UPDATE ON public.work_order_materials
  FOR EACH ROW EXECUTE FUNCTION public.compute_wo_material_totals();

-- Trigger for equipment
CREATE OR REPLACE FUNCTION public.compute_wo_equipment_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.markup_amount := COALESCE(NEW.cost, 0) * COALESCE(NEW.markup_percent, 0) / 100;
  NEW.billed_amount := COALESCE(NEW.cost, 0) + NEW.markup_amount;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wo_equipment_totals
  BEFORE INSERT OR UPDATE ON public.work_order_equipment
  FOR EACH ROW EXECUTE FUNCTION public.compute_wo_equipment_totals();

-- RLS for work_order_materials
ALTER TABLE public.work_order_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project participants can view materials"
  ON public.work_order_materials FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_team pt
      WHERE pt.project_id = work_order_materials.project_id
        AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can insert materials"
  ON public.work_order_materials FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_org_roles uor
      WHERE uor.organization_id = work_order_materials.org_id
        AND uor.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator can update own materials"
  ON public.work_order_materials FOR UPDATE TO authenticated
  USING (created_by_user_id = auth.uid());

CREATE POLICY "Creator can delete own materials"
  ON public.work_order_materials FOR DELETE TO authenticated
  USING (created_by_user_id = auth.uid());

-- RLS for work_order_equipment
ALTER TABLE public.work_order_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project participants can view equipment"
  ON public.work_order_equipment FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_team pt
      WHERE pt.project_id = work_order_equipment.project_id
        AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can insert equipment"
  ON public.work_order_equipment FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_org_roles uor
      WHERE uor.organization_id = work_order_equipment.org_id
        AND uor.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator can update own equipment"
  ON public.work_order_equipment FOR UPDATE TO authenticated
  USING (created_by_user_id = auth.uid());

CREATE POLICY "Creator can delete own equipment"
  ON public.work_order_equipment FOR DELETE TO authenticated
  USING (created_by_user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.work_order_materials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_order_equipment;
