-- Let any signed-in user see the built-in Ontime Master Catalog supplier row
-- so the order wizard can offer the generic catalog on every project.
CREATE POLICY "Authenticated users can view system suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (is_system = true);