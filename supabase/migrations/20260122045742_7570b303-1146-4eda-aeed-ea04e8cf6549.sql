-- Create PO status enum
CREATE TYPE public.po_status AS ENUM ('DRAFT', 'SENT');

-- Create purchase_orders table
CREATE TABLE public.purchase_orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    work_item_id UUID REFERENCES public.work_items(id) ON DELETE SET NULL,
    material_order_id UUID REFERENCES public.material_orders(id) ON DELETE SET NULL,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    po_number TEXT NOT NULL,
    po_name TEXT NOT NULL,
    status public.po_status NOT NULL DEFAULT 'DRAFT',
    notes TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_by UUID,
    download_token UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT po_has_project_or_work_item CHECK (project_id IS NOT NULL OR work_item_id IS NOT NULL)
);

-- Create po_line_items table (snapshot of items)
CREATE TABLE public.po_line_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    supplier_sku TEXT,
    description TEXT NOT NULL,
    quantity NUMERIC(12,4) NOT NULL,
    uom TEXT NOT NULL DEFAULT 'EA',
    -- Lumber details for reference
    pieces INTEGER,
    length_ft NUMERIC(8,2),
    computed_bf NUMERIC(12,4),
    computed_lf NUMERIC(12,4),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence for PO numbers per organization
CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;

-- Function to generate PO number
CREATE OR REPLACE FUNCTION public.generate_po_number(org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    org_code TEXT;
    seq_num INTEGER;
BEGIN
    SELECT o.org_code INTO org_code FROM organizations o WHERE o.id = org_id;
    seq_num := nextval('po_number_seq');
    RETURN 'PO-' || org_code || '-' || to_char(now(), 'YYMMDD') || '-' || lpad(seq_num::TEXT, 4, '0');
END;
$$;

-- Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_line_items ENABLE ROW LEVEL SECURITY;

-- Purchase Orders RLS policies
CREATE POLICY "Org members can view POs"
ON public.purchase_orders FOR SELECT
USING (user_in_org(auth.uid(), organization_id));

CREATE POLICY "PM roles can create POs"
ON public.purchase_orders FOR INSERT
WITH CHECK (is_pm_role(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "PM roles can update draft POs"
ON public.purchase_orders FOR UPDATE
USING (is_pm_role(auth.uid()) AND organization_id = get_user_org_id(auth.uid()) AND status = 'DRAFT');

CREATE POLICY "GC_PM can update any PO"
ON public.purchase_orders FOR UPDATE
USING (is_gc_pm(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "GC_PM can delete draft POs"
ON public.purchase_orders FOR DELETE
USING (is_gc_pm(auth.uid()) AND organization_id = get_user_org_id(auth.uid()) AND status = 'DRAFT');

-- PO Line Items RLS policies
CREATE POLICY "Users can view PO line items"
ON public.po_line_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM purchase_orders po
        WHERE po.id = po_id
        AND user_in_org(auth.uid(), po.organization_id)
    )
);

CREATE POLICY "PM roles can insert line items for draft POs"
ON public.po_line_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM purchase_orders po
        WHERE po.id = po_id
        AND po.status = 'DRAFT'
        AND is_pm_role(auth.uid())
        AND user_in_org(auth.uid(), po.organization_id)
    )
);

CREATE POLICY "PM roles can update line items for draft POs"
ON public.po_line_items FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM purchase_orders po
        WHERE po.id = po_id
        AND po.status = 'DRAFT'
        AND is_pm_role(auth.uid())
        AND user_in_org(auth.uid(), po.organization_id)
    )
);

CREATE POLICY "PM roles can delete line items from draft POs"
ON public.po_line_items FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM purchase_orders po
        WHERE po.id = po_id
        AND po.status = 'DRAFT'
        AND is_pm_role(auth.uid())
        AND user_in_org(auth.uid(), po.organization_id)
    )
);

-- Add trigger for updated_at
CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_purchase_orders_org ON public.purchase_orders(organization_id);
CREATE INDEX idx_purchase_orders_project ON public.purchase_orders(project_id);
CREATE INDEX idx_purchase_orders_work_item ON public.purchase_orders(work_item_id);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_purchase_orders_download_token ON public.purchase_orders(download_token);
CREATE INDEX idx_po_line_items_po ON public.po_line_items(po_id);