DROP POLICY "Authorized orgs can update returns" ON public.returns;

CREATE POLICY "Authorized orgs can update returns" ON public.returns
  FOR UPDATE
  USING (
    (user_in_org(auth.uid(), created_by_org_id)
      AND status IN ('DRAFT','APPROVED','SCHEDULED','PRICED'))
    OR
    (user_in_org(auth.uid(), supplier_org_id)
      AND status IN ('SUBMITTED','SUPPLIER_REVIEW','PICKED_UP','SCHEDULED'))
  )
  WITH CHECK (
    (user_in_org(auth.uid(), created_by_org_id)
      AND status IN ('DRAFT','SUBMITTED','SCHEDULED','CLOSED'))
    OR
    (user_in_org(auth.uid(), supplier_org_id)
      AND status IN ('SUPPLIER_REVIEW','APPROVED','PICKED_UP','PRICED'))
  );