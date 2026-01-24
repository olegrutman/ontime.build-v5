-- Create invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID')),
  subtotal numeric NOT NULL DEFAULT 0,
  retainage_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  submitted_at timestamptz,
  submitted_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  rejected_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id),
  rejection_reason text,
  paid_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, invoice_number)
);

-- Create invoice line items table
CREATE TABLE public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  work_item_id uuid REFERENCES public.work_items(id) ON DELETE SET NULL,
  description text NOT NULL,
  scheduled_value numeric NOT NULL DEFAULT 0,
  previous_billed numeric NOT NULL DEFAULT 0,
  current_billed numeric NOT NULL DEFAULT 0,
  total_billed numeric NOT NULL DEFAULT 0,
  retainage_percent numeric NOT NULL DEFAULT 0,
  retainage_amount numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoices
CREATE POLICY "Users can view invoices for their projects"
  ON public.invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = invoices.project_id
      AND (p.organization_id IN (
        SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
      ) OR p.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can create invoices for their projects"
  ON public.invoices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND (p.organization_id IN (
        SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
      ) OR p.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can update their project invoices"
  ON public.invoices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = invoices.project_id
      AND (p.organization_id IN (
        SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
      ) OR p.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can delete draft invoices"
  ON public.invoices FOR DELETE
  USING (
    status = 'DRAFT' AND
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = invoices.project_id
      AND (p.organization_id IN (
        SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
      ) OR p.created_by = auth.uid())
    )
  );

-- RLS policies for invoice line items
CREATE POLICY "Users can view invoice line items"
  ON public.invoice_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.projects p ON p.id = i.project_id
      WHERE i.id = invoice_line_items.invoice_id
      AND (p.organization_id IN (
        SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
      ) OR p.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can manage invoice line items"
  ON public.invoice_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.projects p ON p.id = i.project_id
      WHERE i.id = invoice_id
      AND i.status = 'DRAFT'
      AND (p.organization_id IN (
        SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
      ) OR p.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can update invoice line items"
  ON public.invoice_line_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.projects p ON p.id = i.project_id
      WHERE i.id = invoice_line_items.invoice_id
      AND i.status = 'DRAFT'
      AND (p.organization_id IN (
        SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
      ) OR p.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can delete invoice line items"
  ON public.invoice_line_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.projects p ON p.id = i.project_id
      WHERE i.id = invoice_line_items.invoice_id
      AND i.status = 'DRAFT'
      AND (p.organization_id IN (
        SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
      ) OR p.created_by = auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);

-- Add trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();