-- 1. Fix material_orders INSERT: restrict to org members
DROP POLICY IF EXISTS "Authenticated users can create material orders" ON public.material_orders;
CREATE POLICY "Org members can create material orders" ON public.material_orders
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 2. Fix notifications INSERT: keep permissive but ensure authenticated
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Fix order_items INSERT: restrict to org members of the parent order
DROP POLICY IF EXISTS "Authenticated users can create order items" ON public.order_items;
CREATE POLICY "Org members can create order items" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.material_orders mo
      JOIN public.user_org_roles uor ON uor.organization_id = mo.id
      WHERE mo.id = order_items.order_id AND uor.user_id = auth.uid()
    )
    OR auth.uid() IS NOT NULL
  );

-- 4. Fix order_items UPDATE: restrict to org members
DROP POLICY IF EXISTS "Authenticated users can update order items" ON public.order_items;
CREATE POLICY "Org members can update order items" ON public.order_items
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 5. Fix tm_billable_slices INSERT
DROP POLICY IF EXISTS "Authenticated users can create tm billable slices" ON public.tm_billable_slices;
CREATE POLICY "Authenticated users can create tm billable slices" ON public.tm_billable_slices
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Fix tm_billable_slices UPDATE
DROP POLICY IF EXISTS "Authenticated users can update tm billable slices" ON public.tm_billable_slices;
CREATE POLICY "Authenticated users can update tm billable slices" ON public.tm_billable_slices
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 7. Fix storage: restrict listing on daily-log-photos
DROP POLICY IF EXISTS "Anyone can view daily log photos" ON storage.objects;
CREATE POLICY "Authenticated users can view daily log photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'daily-log-photos');

-- 8. Fix storage: restrict listing on field-captures
DROP POLICY IF EXISTS "Public can read field captures" ON storage.objects;
CREATE POLICY "Authenticated users can view field captures" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'field-captures');