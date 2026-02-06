
CREATE POLICY "Pricing owner can finalize PO"
ON purchase_orders FOR UPDATE TO public
USING (
  is_pm_role(auth.uid())
  AND user_in_org(auth.uid(), pricing_owner_org_id)
  AND status = 'PRICED'
)
WITH CHECK (
  is_pm_role(auth.uid())
  AND user_in_org(auth.uid(), pricing_owner_org_id)
  AND status IN ('PRICED', 'FINALIZED')
);
