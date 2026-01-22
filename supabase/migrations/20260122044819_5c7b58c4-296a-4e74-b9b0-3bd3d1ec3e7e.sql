-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'FULFILLED', 'CANCELLED');

-- Create work_items table (the unified work item model)
CREATE TABLE public.work_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    parent_work_item_id UUID REFERENCES public.work_items(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('PROJECT', 'SOV_ITEM', 'CHANGE_WORK', 'TM_WORK')),
    title TEXT NOT NULL,
    description TEXT,
    state TEXT NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN', 'PRICED', 'APPROVED', 'EXECUTED', 'CLOSED')),
    location_ref TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create material_orders table
CREATE TABLE public.material_orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    order_number TEXT,
    status public.order_status NOT NULL DEFAULT 'DRAFT',
    ordering_mode TEXT NOT NULL CHECK (ordering_mode IN ('PACKS', 'ITEMS')),
    notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    submitted_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.material_orders(id) ON DELETE CASCADE,
    pack_id UUID REFERENCES public.estimate_packs(id) ON DELETE SET NULL,
    catalog_item_id UUID REFERENCES public.catalog_items(id) ON DELETE SET NULL,
    supplier_sku TEXT,
    description TEXT NOT NULL,
    category TEXT,
    -- Quantity fields
    quantity NUMERIC(12,4) NOT NULL DEFAULT 1,
    uom TEXT NOT NULL DEFAULT 'EA',
    -- Lumber-specific fields
    pieces INTEGER,
    length_ft NUMERIC(8,2),
    width_in NUMERIC(6,2),
    thickness_in NUMERIC(6,2),
    -- Computed quantities
    computed_bf NUMERIC(12,4), -- Board feet for dimensional
    computed_lf NUMERIC(12,4), -- Linear feet for engineered
    -- Metadata
    notes TEXT,
    from_pack BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Work Items RLS policies
CREATE POLICY "Org members can view work items"
ON public.work_items FOR SELECT
USING (user_in_org(auth.uid(), organization_id));

CREATE POLICY "PM roles can create work items"
ON public.work_items FOR INSERT
WITH CHECK (is_pm_role(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "PM roles can update work items"
ON public.work_items FOR UPDATE
USING (is_pm_role(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "GC_PM can delete work items"
ON public.work_items FOR DELETE
USING (is_gc_pm(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

-- Material Orders RLS policies
CREATE POLICY "Org members can view orders"
ON public.material_orders FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM work_items wi
        WHERE wi.id = work_item_id
        AND user_in_org(auth.uid(), wi.organization_id)
    )
);

CREATE POLICY "PM and FS can create orders"
ON public.material_orders FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM work_items wi
        WHERE wi.id = work_item_id
        AND user_in_org(auth.uid(), wi.organization_id)
        AND (is_pm_role(auth.uid()) OR has_role(auth.uid(), 'FS'))
    )
);

CREATE POLICY "PM and FS can update draft orders"
ON public.material_orders FOR UPDATE
USING (
    status = 'DRAFT' AND
    EXISTS (
        SELECT 1 FROM work_items wi
        WHERE wi.id = work_item_id
        AND user_in_org(auth.uid(), wi.organization_id)
        AND (is_pm_role(auth.uid()) OR has_role(auth.uid(), 'FS'))
    )
);

CREATE POLICY "GC_PM can update any order"
ON public.material_orders FOR UPDATE
USING (
    is_gc_pm(auth.uid()) AND
    EXISTS (
        SELECT 1 FROM work_items wi
        WHERE wi.id = work_item_id
        AND user_in_org(auth.uid(), wi.organization_id)
    )
);

-- Order Items RLS policies
CREATE POLICY "Users can view order items"
ON public.order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM material_orders mo
        JOIN work_items wi ON wi.id = mo.work_item_id
        WHERE mo.id = order_id
        AND user_in_org(auth.uid(), wi.organization_id)
    )
);

CREATE POLICY "Users can insert order items for draft orders"
ON public.order_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM material_orders mo
        JOIN work_items wi ON wi.id = mo.work_item_id
        WHERE mo.id = order_id
        AND mo.status = 'DRAFT'
        AND user_in_org(auth.uid(), wi.organization_id)
        AND (is_pm_role(auth.uid()) OR has_role(auth.uid(), 'FS'))
    )
);

CREATE POLICY "Users can update order items for draft orders"
ON public.order_items FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM material_orders mo
        JOIN work_items wi ON wi.id = mo.work_item_id
        WHERE mo.id = order_id
        AND mo.status = 'DRAFT'
        AND user_in_org(auth.uid(), wi.organization_id)
        AND (is_pm_role(auth.uid()) OR has_role(auth.uid(), 'FS'))
    )
);

CREATE POLICY "Users can delete order items from draft orders"
ON public.order_items FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM material_orders mo
        JOIN work_items wi ON wi.id = mo.work_item_id
        WHERE mo.id = order_id
        AND mo.status = 'DRAFT'
        AND user_in_org(auth.uid(), wi.organization_id)
        AND (is_pm_role(auth.uid()) OR has_role(auth.uid(), 'FS'))
    )
);

-- Add triggers for updated_at
CREATE TRIGGER update_work_items_updated_at
    BEFORE UPDATE ON public.work_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_orders_updated_at
    BEFORE UPDATE ON public.material_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_work_items_org ON public.work_items(organization_id);
CREATE INDEX idx_work_items_parent ON public.work_items(parent_work_item_id);
CREATE INDEX idx_work_items_project ON public.work_items(project_id);
CREATE INDEX idx_work_items_type ON public.work_items(item_type);
CREATE INDEX idx_material_orders_work_item ON public.material_orders(work_item_id);
CREATE INDEX idx_material_orders_status ON public.material_orders(status);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_pack ON public.order_items(pack_id);
CREATE INDEX idx_order_items_catalog ON public.order_items(catalog_item_id);