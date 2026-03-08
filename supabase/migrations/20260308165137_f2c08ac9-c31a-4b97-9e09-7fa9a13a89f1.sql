-- Allow platform users to view all project contracts
CREATE POLICY "Platform users can view all contracts"
ON public.project_contracts FOR SELECT
USING (is_platform_user(auth.uid()));

-- Allow platform users to view all supplier estimates
CREATE POLICY "Platform users can view all supplier estimates"
ON public.supplier_estimates FOR SELECT
USING (is_platform_user(auth.uid()));