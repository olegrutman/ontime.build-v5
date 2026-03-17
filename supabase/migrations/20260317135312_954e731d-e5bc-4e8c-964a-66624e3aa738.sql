
-- 1. Add hourly_rate to profiles
ALTER TABLE public.profiles ADD COLUMN hourly_rate decimal NULL;

-- 2. work_order_catalog
CREATE TABLE public.work_order_catalog (
  id               uuid primary key default gen_random_uuid(),
  division         text not null,
  category_id      text not null,
  category_name    text not null,
  group_id         text not null,
  group_label      text not null,
  item_name        text not null,
  unit             text not null,
  category_color   text not null default '#6B7280',
  category_bg      text not null default '#F9FAFB',
  category_icon    text not null default '•',
  sort_order       integer default 0,
  org_id           uuid references public.organizations(id),
  created_at       timestamptz default now()
);
ALTER TABLE public.work_order_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Global catalog readable by authenticated users" ON public.work_order_catalog FOR SELECT TO authenticated USING (org_id IS NULL);
CREATE POLICY "Org catalog readable by org members" ON public.work_order_catalog FOR SELECT TO authenticated USING (org_id IS NOT NULL AND org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()));

-- 3. change_orders
CREATE TABLE public.change_orders (
  id                       uuid primary key default gen_random_uuid(),
  org_id                   uuid references public.organizations(id) not null,
  project_id               uuid references public.projects(id) not null,
  created_by_user_id       uuid references public.profiles(id) not null,
  created_by_role          text not null,
  co_number                text,
  title                    text,
  status                   text not null default 'draft',
  pricing_type             text not null default 'fixed',
  nte_cap                  decimal,
  nte_increase_requested   decimal,
  nte_increase_approved    boolean,
  reason                   text,
  reason_note              text,
  location_tag             text,
  assigned_to_org_id       uuid references public.organizations(id),
  fc_input_needed          boolean not null default false,
  materials_needed         boolean not null default false,
  materials_on_site        boolean not null default false,
  equipment_needed         boolean not null default false,
  materials_responsible    text,
  equipment_responsible    text,
  shared_at                timestamptz,
  combined_at              timestamptz,
  combined_co_id           uuid references public.change_orders(id),
  parent_co_id             uuid references public.change_orders(id),
  submitted_at             timestamptz,
  approved_at              timestamptz,
  rejected_at              timestamptz,
  rejection_note           text,
  contracted_at            timestamptz,
  draft_shared_with_next   boolean not null default false,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own org change orders" ON public.change_orders FOR SELECT TO authenticated USING (org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()) OR assigned_to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert change orders for their org" ON public.change_orders FOR INSERT TO authenticated WITH CHECK (org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their own org change orders" ON public.change_orders FOR UPDATE TO authenticated USING (org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()));

-- 4. co_line_items
CREATE TABLE public.co_line_items (
  id                uuid primary key default gen_random_uuid(),
  co_id             uuid references public.change_orders(id) on delete cascade not null,
  org_id            uuid references public.organizations(id) not null,
  created_by_role   text not null,
  catalog_item_id   uuid references public.work_order_catalog(id),
  item_name         text not null,
  division          text,
  category_name     text,
  unit              text not null,
  qty               decimal,
  sort_order        integer default 0,
  created_at        timestamptz default now()
);
ALTER TABLE public.co_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Line items readable by co participants" ON public.co_line_items FOR SELECT TO authenticated USING (co_id IN (SELECT id FROM public.change_orders WHERE org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()) OR assigned_to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())));
CREATE POLICY "Line items insertable by co owner org" ON public.co_line_items FOR INSERT TO authenticated WITH CHECK (org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()));
CREATE POLICY "Line items updatable by co owner org" ON public.co_line_items FOR UPDATE TO authenticated USING (org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()));
CREATE POLICY "Line items deletable by co owner org" ON public.co_line_items FOR DELETE TO authenticated USING (org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()));

-- 5. co_labor_entries
CREATE TABLE public.co_labor_entries (
  id                    uuid primary key default gen_random_uuid(),
  co_id                 uuid references public.change_orders(id) on delete cascade not null,
  co_line_item_id       uuid references public.co_line_items(id) on delete cascade not null,
  org_id                uuid references public.organizations(id) not null,
  entered_by_role       text not null,
  entry_date            date not null default current_date,
  pricing_mode          text not null default 'hourly',
  hours                 decimal,
  hourly_rate           decimal,
  lump_sum              decimal,
  line_total            decimal generated always as (
    case
      when pricing_mode = 'lump_sum' then coalesce(lump_sum, 0)
      else coalesce(hours, 0) * coalesce(hourly_rate, 0)
    end
  ) stored,
  description           text,
  is_actual_cost        boolean not null default false,
  actual_cost_note      text,
  created_at            timestamptz default now()
);
ALTER TABLE public.co_labor_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Labor entries readable by co participants" ON public.co_labor_entries FOR SELECT TO authenticated USING (co_id IN (SELECT id FROM public.change_orders WHERE org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()) OR assigned_to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())));
CREATE POLICY "Labor entries insertable by own org" ON public.co_labor_entries FOR INSERT TO authenticated WITH CHECK (org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()));
CREATE POLICY "Labor entries updatable by own org" ON public.co_labor_entries FOR UPDATE TO authenticated USING (org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()));
CREATE POLICY "Labor entries deletable by own org" ON public.co_labor_entries FOR DELETE TO authenticated USING (org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()));

-- 6. co_material_items
CREATE TABLE public.co_material_items (
  id               uuid primary key default gen_random_uuid(),
  co_id            uuid references public.change_orders(id) on delete cascade not null,
  org_id           uuid references public.organizations(id) not null,
  added_by_role    text not null,
  line_number      integer not null default 1,
  description      text not null,
  supplier_sku     text,
  quantity         decimal not null default 1,
  uom              text not null default 'ea',
  unit_cost        decimal,
  line_cost        decimal generated always as (quantity * coalesce(unit_cost, 0)) stored,
  markup_percent   decimal not null default 0,
  markup_amount    decimal generated always as (quantity * coalesce(unit_cost, 0) * markup_percent / 100) stored,
  billed_amount    decimal generated always as (quantity * coalesce(unit_cost, 0) * (1 + markup_percent / 100)) stored,
  notes            text,
  is_on_site       boolean not null default false,
  created_at       timestamptz default now()
);
ALTER TABLE public.co_material_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Material items readable by co participants" ON public.co_material_items FOR SELECT TO authenticated USING (co_id IN (SELECT id FROM public.change_orders WHERE org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()) OR assigned_to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())));
CREATE POLICY "Material items insertable by own org" ON public.co_material_items FOR INSERT TO authenticated WITH CHECK (org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()));
CREATE POLICY "Material items updatable by own org" ON public.co_material_items FOR UPDATE TO authenticated USING (org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()));
CREATE POLICY "Material items deletable by own org" ON public.co_material_items FOR DELETE TO authenticated USING (org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()));

-- 7. co_equipment_items
CREATE TABLE public.co_equipment_items (
  id               uuid primary key default gen_random_uuid(),
  co_id            uuid references public.change_orders(id) on delete cascade not null,
  org_id           uuid references public.organizations(id) not null,
  added_by_role    text not null,
  description      text not null,
  duration_note    text,
  cost             decimal not null default 0,
  markup_percent   decimal not null default 0,
  markup_amount    decimal generated always as (cost * markup_percent / 100) stored,
  billed_amount    decimal generated always as (cost * (1 + markup_percent / 100)) stored,
  notes            text,
  created_at       timestamptz default now()
);
ALTER TABLE public.co_equipment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipment items readable by co participants" ON public.co_equipment_items FOR SELECT TO authenticated USING (co_id IN (SELECT id FROM public.change_orders WHERE org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()) OR assigned_to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())));
CREATE POLICY "Equipment items insertable by own org" ON public.co_equipment_items FOR INSERT TO authenticated WITH CHECK (org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()));
CREATE POLICY "Equipment items updatable by own org" ON public.co_equipment_items FOR UPDATE TO authenticated USING (org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()));
CREATE POLICY "Equipment items deletable by own org" ON public.co_equipment_items FOR DELETE TO authenticated USING (org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()));

-- 8. co_nte_log
CREATE TABLE public.co_nte_log (
  id                         uuid primary key default gen_random_uuid(),
  co_id                      uuid references public.change_orders(id) on delete cascade not null,
  requested_by_user_id       uuid references public.profiles(id) not null,
  requested_increase         decimal not null,
  running_total_at_request   decimal not null,
  current_cap_at_request     decimal not null,
  approved_by_user_id        uuid references public.profiles(id),
  approved_at                timestamptz,
  new_cap_after_approval     decimal,
  rejected_at                timestamptz,
  rejection_note             text,
  created_at                 timestamptz default now()
);
ALTER TABLE public.co_nte_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "NTE log readable by co participants" ON public.co_nte_log FOR SELECT TO authenticated USING (co_id IN (SELECT id FROM public.change_orders WHERE org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()) OR assigned_to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())));
CREATE POLICY "NTE log insertable by co participants" ON public.co_nte_log FOR INSERT TO authenticated WITH CHECK (co_id IN (SELECT id FROM public.change_orders WHERE org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()) OR assigned_to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())));
CREATE POLICY "NTE log updatable by co participants" ON public.co_nte_log FOR UPDATE TO authenticated USING (co_id IN (SELECT id FROM public.change_orders WHERE org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()) OR assigned_to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())));

-- 9. co_combined_members
CREATE TABLE public.co_combined_members (
  id               uuid primary key default gen_random_uuid(),
  combined_co_id   uuid references public.change_orders(id) on delete cascade not null,
  member_co_id     uuid references public.change_orders(id) on delete cascade not null,
  added_at         timestamptz default now()
);
ALTER TABLE public.co_combined_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Combined members readable by co participants" ON public.co_combined_members FOR SELECT TO authenticated USING (combined_co_id IN (SELECT id FROM public.change_orders WHERE org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()) OR assigned_to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())));
CREATE POLICY "Combined members insertable by co owner" ON public.co_combined_members FOR INSERT TO authenticated WITH CHECK (combined_co_id IN (SELECT id FROM public.change_orders WHERE org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())));

-- 10. co_activity
CREATE TABLE public.co_activity (
  id               uuid primary key default gen_random_uuid(),
  co_id            uuid references public.change_orders(id) on delete cascade not null,
  project_id       uuid references public.projects(id) not null,
  actor_user_id    uuid references public.profiles(id) not null,
  actor_role       text not null,
  action           text not null,
  detail           text,
  amount           decimal,
  created_at       timestamptz default now()
);
ALTER TABLE public.co_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activity readable by co participants" ON public.co_activity FOR SELECT TO authenticated USING (co_id IN (SELECT id FROM public.change_orders WHERE org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()) OR assigned_to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())));
CREATE POLICY "Activity insertable by co participants" ON public.co_activity FOR INSERT TO authenticated WITH CHECK (co_id IN (SELECT id FROM public.change_orders WHERE org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()) OR assigned_to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())));

-- 11. Enable realtime on co_labor_entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.co_labor_entries;
