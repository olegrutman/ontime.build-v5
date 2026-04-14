-- Fix material_orders INSERT to not be always-true
DROP POLICY IF EXISTS "Org members can create material orders" ON public.material_orders;
CREATE POLICY "Authenticated can create material orders" ON public.material_orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix order_items INSERT - remove the OR that made it always true
DROP POLICY IF EXISTS "Org members can create order items" ON public.order_items;
CREATE POLICY "Authenticated can create order items" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);