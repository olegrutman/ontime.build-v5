
-- Bug 2: Platform users can view all user_org_roles
CREATE POLICY "Platform users can view all user_org_roles"
  ON public.user_org_roles FOR SELECT
  TO authenticated
  USING (is_platform_user(auth.uid()));

-- Bug 3: Platform users can view all project_team
CREATE POLICY "Platform users can view all project_team"
  ON public.project_team FOR SELECT
  TO authenticated
  USING (is_platform_user(auth.uid()));

-- Bug 3: Platform users can view all purchase_orders
CREATE POLICY "Platform users can view all purchase_orders"
  ON public.purchase_orders FOR SELECT
  TO authenticated
  USING (is_platform_user(auth.uid()));

-- Bug 3: Platform users can view all invoices
CREATE POLICY "Platform users can view all invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (is_platform_user(auth.uid()));

-- Bug 3: Platform users can view all work_items
CREATE POLICY "Platform users can view all work_items"
  ON public.work_items FOR SELECT
  TO authenticated
  USING (is_platform_user(auth.uid()));
