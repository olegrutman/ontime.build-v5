
-- co_labor_entries: fix recursive RLS
DROP POLICY IF EXISTS "Labor entries insertable by own org" ON public.co_labor_entries;
CREATE POLICY "Labor entries insertable by own org" ON public.co_labor_entries
  FOR INSERT TO authenticated WITH CHECK (user_in_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Labor entries updatable by own org" ON public.co_labor_entries;
CREATE POLICY "Labor entries updatable by own org" ON public.co_labor_entries
  FOR UPDATE TO authenticated USING (user_in_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Labor entries deletable by own org" ON public.co_labor_entries;
CREATE POLICY "Labor entries deletable by own org" ON public.co_labor_entries
  FOR DELETE TO authenticated USING (user_in_org(auth.uid(), org_id));

-- co_material_items: fix recursive RLS
DROP POLICY IF EXISTS "Material items insertable by own org" ON public.co_material_items;
CREATE POLICY "Material items insertable by own org" ON public.co_material_items
  FOR INSERT TO authenticated WITH CHECK (user_in_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Material items updatable by own org" ON public.co_material_items;
CREATE POLICY "Material items updatable by own org" ON public.co_material_items
  FOR UPDATE TO authenticated USING (user_in_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Material items deletable by own org" ON public.co_material_items;
CREATE POLICY "Material items deletable by own org" ON public.co_material_items
  FOR DELETE TO authenticated USING (user_in_org(auth.uid(), org_id));

-- co_equipment_items: fix recursive RLS
DROP POLICY IF EXISTS "Equipment items insertable by own org" ON public.co_equipment_items;
CREATE POLICY "Equipment items insertable by own org" ON public.co_equipment_items
  FOR INSERT TO authenticated WITH CHECK (user_in_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Equipment items updatable by own org" ON public.co_equipment_items;
CREATE POLICY "Equipment items updatable by own org" ON public.co_equipment_items
  FOR UPDATE TO authenticated USING (user_in_org(auth.uid(), org_id));

DROP POLICY IF EXISTS "Equipment items deletable by own org" ON public.co_equipment_items;
CREATE POLICY "Equipment items deletable by own org" ON public.co_equipment_items
  FOR DELETE TO authenticated USING (user_in_org(auth.uid(), org_id));
