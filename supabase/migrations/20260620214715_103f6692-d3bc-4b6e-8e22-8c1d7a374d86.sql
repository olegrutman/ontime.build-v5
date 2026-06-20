
-- 1) Require 2FA for is_platform_user (already required by is_platform_staff)
CREATE OR REPLACE FUNCTION public.is_platform_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_users
    WHERE user_id = _user_id
      AND platform_role <> 'NONE'
      AND COALESCE(two_factor_verified, false) = true
  );
$$;

-- 2) Drop over-permissive anon policies on change_orders (external approval now via edge function)
DROP POLICY IF EXISTS "Public can update CO approval via token" ON public.change_orders;
DROP POLICY IF EXISTS "Public can view CO by approval token" ON public.change_orders;

-- 3) Drop over-permissive public policies on co_external_invites (external invite flow now via edge function)
DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.co_external_invites;
DROP POLICY IF EXISTS "Anyone can respond to invite by token" ON public.co_external_invites;

-- 4) Restrict notifications INSERT to org members or platform staff
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Org members or platform staff can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_platform_staff(auth.uid())
  OR (recipient_org_id IS NOT NULL AND public.user_in_org(auth.uid(), recipient_org_id))
  OR (recipient_user_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.user_org_roles me
        JOIN public.user_org_roles them
          ON them.organization_id = me.organization_id
        WHERE me.user_id = auth.uid()
          AND them.user_id = recipient_user_id
      ))
);

-- 5) Lock down material_orders to members of the supplier's organization
ALTER TABLE public.material_orders ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='material_orders' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.material_orders', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Supplier org members can read material orders"
  ON public.material_orders FOR SELECT TO authenticated
  USING (
    public.is_platform_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = material_orders.supplier_id
        AND public.user_in_org(auth.uid(), s.organization_id)
    )
  );
CREATE POLICY "Supplier org members can insert material orders"
  ON public.material_orders FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = material_orders.supplier_id
        AND public.user_in_org(auth.uid(), s.organization_id)
    )
  );
CREATE POLICY "Supplier org members can update material orders"
  ON public.material_orders FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = material_orders.supplier_id
        AND public.user_in_org(auth.uid(), s.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = material_orders.supplier_id
        AND public.user_in_org(auth.uid(), s.organization_id)
    )
  );
CREATE POLICY "Supplier org members can delete material orders"
  ON public.material_orders FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = material_orders.supplier_id
        AND public.user_in_org(auth.uid(), s.organization_id)
    )
  );

-- 6) Lock down order_items via parent material_order's supplier org
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='order_items' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.order_items', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Supplier org members can read order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    public.is_platform_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.material_orders mo
      JOIN public.suppliers s ON s.id = mo.supplier_id
      WHERE mo.id = order_items.order_id
        AND public.user_in_org(auth.uid(), s.organization_id)
    )
  );
CREATE POLICY "Supplier org members can write order items"
  ON public.order_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.material_orders mo
      JOIN public.suppliers s ON s.id = mo.supplier_id
      WHERE mo.id = order_items.order_id
        AND public.user_in_org(auth.uid(), s.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.material_orders mo
      JOIN public.suppliers s ON s.id = mo.supplier_id
      WHERE mo.id = order_items.order_id
        AND public.user_in_org(auth.uid(), s.organization_id)
    )
  );

-- 7) tm_billable_slices: lock to platform staff only (no clear ownership; orphan references)
ALTER TABLE public.tm_billable_slices ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='tm_billable_slices' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tm_billable_slices', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Platform staff only on tm_billable_slices"
  ON public.tm_billable_slices FOR ALL TO authenticated
  USING (public.is_platform_staff(auth.uid()))
  WITH CHECK (public.is_platform_staff(auth.uid()));

-- 8) Hide hourly_rate column on profiles from non-privileged roles
REVOKE SELECT (hourly_rate) ON public.profiles FROM anon, authenticated;
-- platform staff / service_role retain full access via ALL grants elsewhere
GRANT SELECT (hourly_rate) ON public.profiles TO service_role;
