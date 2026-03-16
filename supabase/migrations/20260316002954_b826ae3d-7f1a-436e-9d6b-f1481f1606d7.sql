
CREATE TABLE public.work_order_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division TEXT NOT NULL,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  group_id TEXT NOT NULL,
  group_label TEXT NOT NULL,
  item_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  category_color TEXT,
  category_bg TEXT,
  category_icon TEXT,
  sort_order INT DEFAULT 0,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);

ALTER TABLE public.work_order_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read global catalog items"
  ON public.work_order_catalog FOR SELECT TO authenticated
  USING (org_id IS NULL);

CREATE POLICY "Org members can read own catalog items"
  ON public.work_order_catalog FOR SELECT TO authenticated
  USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_org_roles.user_id = auth.uid()
        AND user_org_roles.organization_id = work_order_catalog.org_id
    )
  );

CREATE POLICY "Org members can insert custom catalog items"
  ON public.work_order_catalog FOR INSERT TO authenticated
  WITH CHECK (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_org_roles.user_id = auth.uid()
        AND user_org_roles.organization_id = work_order_catalog.org_id
    )
  );

CREATE TABLE public.work_order_log_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  created_by_user_id UUID NOT NULL,
  catalog_item_id UUID REFERENCES public.work_order_catalog(id),
  item_name TEXT NOT NULL,
  division TEXT NOT NULL,
  category_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  qty DECIMAL,
  hours DECIMAL,
  unit_rate DECIMAL NOT NULL,
  line_total DECIMAL NOT NULL DEFAULT 0,
  material_spec TEXT,
  location TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  linked_change_order_id UUID REFERENCES public.change_order_projects(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  period_week DATE
);

ALTER TABLE public.work_order_log_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.compute_log_item_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.line_total := COALESCE(NEW.qty, NEW.hours, 0) * NEW.unit_rate;
  NEW.period_week := date_trunc('week', NEW.created_at)::date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_log_item_fields
  BEFORE INSERT OR UPDATE ON public.work_order_log_items
  FOR EACH ROW EXECUTE FUNCTION public.compute_log_item_fields();

CREATE OR REPLACE FUNCTION public.validate_log_item_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('open', 'submitted_to_tc', 'submitted_to_gc', 'approved', 'invoiced') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_log_item_status
  BEFORE INSERT OR UPDATE ON public.work_order_log_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_log_item_status();

CREATE POLICY "Project participants can read log items"
  ON public.work_order_log_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_team
      WHERE project_team.project_id = work_order_log_items.project_id
        AND project_team.org_id IN (
          SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can insert own log items"
  ON public.work_order_log_items FOR INSERT TO authenticated
  WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Users can update own open log items"
  ON public.work_order_log_items FOR UPDATE TO authenticated
  USING (created_by_user_id = auth.uid() AND status = 'open')
  WITH CHECK (created_by_user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.work_order_log_items;
