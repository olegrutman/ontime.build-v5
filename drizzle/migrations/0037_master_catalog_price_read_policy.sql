-- Let any signed-in user read list prices from the built-in Ontime Master Catalog
-- (other suppliers' prices stay restricted to buyers who share a project).
CREATE POLICY "Anyone can view master catalog prices"
ON public.catalog_prices
FOR SELECT
TO authenticated
USING (supplier_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');