-- Drop all existing invoice policies first (including any created before)
DROP POLICY IF EXISTS "Users can view invoices for their contracts" ON public.invoices;
DROP POLICY IF EXISTS "Contractors can create invoices for their contracts" ON public.invoices;
DROP POLICY IF EXISTS "Users can update invoices based on contract role" ON public.invoices;
DROP POLICY IF EXISTS "Contractors can delete their draft invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view invoices for their projects" ON public.invoices;
DROP POLICY IF EXISTS "Users can create invoices for their projects" ON public.invoices;
DROP POLICY IF EXISTS "Users can update their project invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete draft invoices" ON public.invoices;

DROP POLICY IF EXISTS "Users can view invoice line items for their contracts" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Contractors can manage invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Contractors can update invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Contractors can delete invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can view invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can manage invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can update invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can delete invoice line items" ON public.invoice_line_items;

-- New SELECT policy: User's org must be party to the contract (from_org_id OR to_org_id)
CREATE POLICY "Users can view invoices for their contracts"
  ON public.invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = invoices.contract_id
      AND (
        pc.from_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())
        OR pc.to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())
      )
    )
    OR (
      invoices.contract_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.project_participants pp
        WHERE pp.project_id = invoices.project_id
        AND pp.organization_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())
      )
    )
  );

-- New INSERT policy: Only the to_org (invoice sender/contractor) can create invoices
CREATE POLICY "Contractors can create invoices for their contracts"
  ON public.invoices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = contract_id
      AND pc.to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())
    )
  );

-- New UPDATE policy: to_org can update drafts, from_org can approve/reject/pay
CREATE POLICY "Users can update invoices based on contract role"
  ON public.invoices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = invoices.contract_id
      AND (
        (
          pc.to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())
          AND invoices.status = 'DRAFT'
        )
        OR (
          pc.from_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())
          AND invoices.status IN ('SUBMITTED', 'APPROVED')
        )
      )
    )
  );

-- New DELETE policy: Only creator org can delete drafts
CREATE POLICY "Contractors can delete their draft invoices"
  ON public.invoices FOR DELETE
  USING (
    status = 'DRAFT' AND
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = invoices.contract_id
      AND pc.to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())
    )
  );

-- Invoice line items policies
CREATE POLICY "Users can view invoice line items for their contracts"
  ON public.invoice_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.project_contracts pc ON pc.id = i.contract_id
      WHERE i.id = invoice_line_items.invoice_id
      AND (
        pc.from_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())
        OR pc.to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Contractors can manage invoice line items"
  ON public.invoice_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.project_contracts pc ON pc.id = i.contract_id
      WHERE i.id = invoice_id
      AND i.status = 'DRAFT'
      AND pc.to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Contractors can update invoice line items"
  ON public.invoice_line_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.project_contracts pc ON pc.id = i.contract_id
      WHERE i.id = invoice_line_items.invoice_id
      AND i.status = 'DRAFT'
      AND pc.to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Contractors can delete invoice line items"
  ON public.invoice_line_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.project_contracts pc ON pc.id = i.contract_id
      WHERE i.id = invoice_line_items.invoice_id
      AND i.status = 'DRAFT'
      AND pc.to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())
    )
  );