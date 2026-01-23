
-- FIX A: Add participant visibility to all child tables using user_is_work_item_participant()

-- 1. change_work_pricing - Add participant visibility for SELECT
DROP POLICY IF EXISTS "PM roles can view pricing for accessible work items" ON public.change_work_pricing;
CREATE POLICY "PM roles can view pricing for accessible work items"
ON public.change_work_pricing FOR SELECT USING (
  -- TC_PM: owner org OR participant org
  (has_role(auth.uid(), 'TC_PM') AND (
    EXISTS (SELECT 1 FROM work_items wi WHERE wi.id = change_work_pricing.work_item_id AND user_in_org(auth.uid(), wi.organization_id))
    OR user_is_work_item_participant(auth.uid(), work_item_id)
  ))
  -- GC_PM: owner org OR participant org, but only after PRICED state
  OR (is_gc_pm(auth.uid()) AND (
    EXISTS (SELECT 1 FROM work_items wi WHERE wi.id = change_work_pricing.work_item_id 
      AND user_in_org(auth.uid(), wi.organization_id) 
      AND wi.state IN ('PRICED', 'APPROVED', 'EXECUTED'))
    OR (user_is_work_item_participant(auth.uid(), work_item_id) 
      AND EXISTS (SELECT 1 FROM work_items wi WHERE wi.id = change_work_pricing.work_item_id 
        AND wi.state IN ('PRICED', 'APPROVED', 'EXECUTED')))
  ))
);

-- 2. labor_entries - Add participant visibility for TC_PM SELECT
DROP POLICY IF EXISTS "TC_PM can view labor entries" ON public.labor_entries;
CREATE POLICY "TC_PM can view labor entries"
ON public.labor_entries FOR SELECT USING (
  has_role(auth.uid(), 'TC_PM') AND (
    EXISTS (SELECT 1 FROM work_items wi WHERE wi.id = labor_entries.work_item_id AND user_in_org(auth.uid(), wi.organization_id))
    OR user_is_work_item_participant(auth.uid(), work_item_id)
  )
);

-- 3. supplier_quotes - Split into SELECT (with participant) and CUD (owner only)
DROP POLICY IF EXISTS "TC_PM can manage supplier quotes" ON public.supplier_quotes;

-- TC_PM SELECT: owner org OR participant org
CREATE POLICY "TC_PM can view supplier quotes"
ON public.supplier_quotes FOR SELECT USING (
  has_role(auth.uid(), 'TC_PM') AND (
    EXISTS (SELECT 1 FROM work_items wi WHERE wi.id = supplier_quotes.work_item_id AND user_in_org(auth.uid(), wi.organization_id))
    OR user_is_work_item_participant(auth.uid(), work_item_id)
  )
);

-- TC_PM INSERT/UPDATE/DELETE: owner org only (no participant write access)
CREATE POLICY "TC_PM can manage own org supplier quotes"
ON public.supplier_quotes FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'TC_PM') AND 
  EXISTS (SELECT 1 FROM work_items wi WHERE wi.id = supplier_quotes.work_item_id AND user_in_org(auth.uid(), wi.organization_id))
);

CREATE POLICY "TC_PM can update own org supplier quotes"
ON public.supplier_quotes FOR UPDATE USING (
  has_role(auth.uid(), 'TC_PM') AND 
  EXISTS (SELECT 1 FROM work_items wi WHERE wi.id = supplier_quotes.work_item_id AND user_in_org(auth.uid(), wi.organization_id))
);

CREATE POLICY "TC_PM can delete own org supplier quotes"
ON public.supplier_quotes FOR DELETE USING (
  has_role(auth.uid(), 'TC_PM') AND 
  EXISTS (SELECT 1 FROM work_items wi WHERE wi.id = supplier_quotes.work_item_id AND user_in_org(auth.uid(), wi.organization_id))
);

-- 4. tm_periods - Add participant visibility for SELECT
DROP POLICY IF EXISTS "Org members can view tm_periods" ON public.tm_periods;
CREATE POLICY "Members or participants can view tm_periods"
ON public.tm_periods FOR SELECT USING (
  EXISTS (SELECT 1 FROM work_items wi WHERE wi.id = tm_periods.work_item_id AND user_in_org(auth.uid(), wi.organization_id))
  OR user_is_work_item_participant(auth.uid(), work_item_id)
);

-- 5. material_orders - Add participant visibility for SELECT
DROP POLICY IF EXISTS "Org members can view orders" ON public.material_orders;
CREATE POLICY "Members or participants can view orders"
ON public.material_orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM work_items wi WHERE wi.id = material_orders.work_item_id AND user_in_org(auth.uid(), wi.organization_id))
  OR user_is_work_item_participant(auth.uid(), work_item_id)
);
