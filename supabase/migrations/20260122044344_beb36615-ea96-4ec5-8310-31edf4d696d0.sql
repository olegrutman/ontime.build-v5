-- Create enums for pack types and estimate status
CREATE TYPE public.pack_type AS ENUM ('LOOSE_MODIFIABLE', 'ENGINEERED_LOCKED');
CREATE TYPE public.estimate_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- Create projects table first (estimates need a project reference)
CREATE TABLE public.projects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_estimates table
CREATE TABLE public.project_estimates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status public.estimate_status NOT NULL DEFAULT 'DRAFT',
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create estimate_packs table
CREATE TABLE public.estimate_packs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    estimate_id UUID NOT NULL REFERENCES public.project_estimates(id) ON DELETE CASCADE,
    pack_name TEXT NOT NULL,
    pack_type public.pack_type NOT NULL DEFAULT 'LOOSE_MODIFIABLE',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pack_items table
CREATE TABLE public.pack_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pack_id UUID NOT NULL REFERENCES public.estimate_packs(id) ON DELETE CASCADE,
    catalog_item_id UUID REFERENCES public.catalog_items(id) ON DELETE SET NULL,
    supplier_sku TEXT,
    description TEXT NOT NULL,
    quantity NUMERIC(12,4) NOT NULL DEFAULT 1,
    uom TEXT NOT NULL DEFAULT 'EA',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_items ENABLE ROW LEVEL SECURITY;

-- Projects RLS policies
CREATE POLICY "Org members can view projects"
ON public.projects FOR SELECT
USING (user_in_org(auth.uid(), organization_id));

CREATE POLICY "GC_PM can create projects"
ON public.projects FOR INSERT
WITH CHECK (is_gc_pm(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "GC_PM can update projects"
ON public.projects FOR UPDATE
USING (is_gc_pm(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "GC_PM can delete projects"
ON public.projects FOR DELETE
USING (is_gc_pm(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

-- Project Estimates RLS policies
-- SUPPLIER can create estimates for their supplier record
CREATE POLICY "SUPPLIER can create estimates"
ON public.project_estimates FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'SUPPLIER') AND 
    EXISTS (
        SELECT 1 FROM suppliers s 
        WHERE s.id = supplier_id 
        AND user_in_org(auth.uid(), s.organization_id)
    )
);

-- SUPPLIER can update their own draft estimates
CREATE POLICY "SUPPLIER can update own draft estimates"
ON public.project_estimates FOR UPDATE
USING (
    has_role(auth.uid(), 'SUPPLIER') AND 
    status = 'DRAFT' AND
    EXISTS (
        SELECT 1 FROM suppliers s 
        WHERE s.id = supplier_id 
        AND user_in_org(auth.uid(), s.organization_id)
    )
);

-- GC_PM and TC_PM can view all estimates in their org
CREATE POLICY "PMs can view estimates"
ON public.project_estimates FOR SELECT
USING (
    is_pm_role(auth.uid()) AND
    EXISTS (
        SELECT 1 FROM projects p 
        WHERE p.id = project_id 
        AND user_in_org(auth.uid(), p.organization_id)
    )
);

-- SUPPLIER can view their own estimates
CREATE POLICY "SUPPLIER can view own estimates"
ON public.project_estimates FOR SELECT
USING (
    has_role(auth.uid(), 'SUPPLIER') AND
    EXISTS (
        SELECT 1 FROM suppliers s 
        WHERE s.id = supplier_id 
        AND user_in_org(auth.uid(), s.organization_id)
    )
);

-- GC_PM can update estimates (for approval workflow)
CREATE POLICY "GC_PM can update estimates for approval"
ON public.project_estimates FOR UPDATE
USING (
    is_gc_pm(auth.uid()) AND
    EXISTS (
        SELECT 1 FROM projects p 
        WHERE p.id = project_id 
        AND user_in_org(auth.uid(), p.organization_id)
    )
);

-- Estimate Packs RLS policies
CREATE POLICY "Users can view packs for accessible estimates"
ON public.estimate_packs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM project_estimates pe
        JOIN projects p ON p.id = pe.project_id
        WHERE pe.id = estimate_id
        AND user_in_org(auth.uid(), p.organization_id)
        AND (is_pm_role(auth.uid()) OR has_role(auth.uid(), 'SUPPLIER'))
    )
);

CREATE POLICY "SUPPLIER can insert packs for own draft estimates"
ON public.estimate_packs FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'SUPPLIER') AND
    EXISTS (
        SELECT 1 FROM project_estimates pe
        JOIN suppliers s ON s.id = pe.supplier_id
        WHERE pe.id = estimate_id
        AND pe.status = 'DRAFT'
        AND user_in_org(auth.uid(), s.organization_id)
    )
);

CREATE POLICY "SUPPLIER can update LOOSE_MODIFIABLE packs in draft estimates"
ON public.estimate_packs FOR UPDATE
USING (
    has_role(auth.uid(), 'SUPPLIER') AND
    pack_type = 'LOOSE_MODIFIABLE' AND
    EXISTS (
        SELECT 1 FROM project_estimates pe
        JOIN suppliers s ON s.id = pe.supplier_id
        WHERE pe.id = estimate_id
        AND pe.status = 'DRAFT'
        AND user_in_org(auth.uid(), s.organization_id)
    )
);

CREATE POLICY "SUPPLIER can delete packs from draft estimates"
ON public.estimate_packs FOR DELETE
USING (
    has_role(auth.uid(), 'SUPPLIER') AND
    EXISTS (
        SELECT 1 FROM project_estimates pe
        JOIN suppliers s ON s.id = pe.supplier_id
        WHERE pe.id = estimate_id
        AND pe.status = 'DRAFT'
        AND user_in_org(auth.uid(), s.organization_id)
    )
);

-- Pack Items RLS policies
CREATE POLICY "Users can view items for accessible packs"
ON public.pack_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM estimate_packs ep
        JOIN project_estimates pe ON pe.id = ep.estimate_id
        JOIN projects p ON p.id = pe.project_id
        WHERE ep.id = pack_id
        AND user_in_org(auth.uid(), p.organization_id)
        AND (is_pm_role(auth.uid()) OR has_role(auth.uid(), 'SUPPLIER'))
    )
);

CREATE POLICY "SUPPLIER can insert items for own draft LOOSE packs"
ON public.pack_items FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'SUPPLIER') AND
    EXISTS (
        SELECT 1 FROM estimate_packs ep
        JOIN project_estimates pe ON pe.id = ep.estimate_id
        JOIN suppliers s ON s.id = pe.supplier_id
        WHERE ep.id = pack_id
        AND ep.pack_type = 'LOOSE_MODIFIABLE'
        AND pe.status = 'DRAFT'
        AND user_in_org(auth.uid(), s.organization_id)
    )
);

-- Allow inserting into ENGINEERED_LOCKED packs during initial upload only
CREATE POLICY "SUPPLIER can insert items into LOCKED packs during draft"
ON public.pack_items FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'SUPPLIER') AND
    EXISTS (
        SELECT 1 FROM estimate_packs ep
        JOIN project_estimates pe ON pe.id = ep.estimate_id
        JOIN suppliers s ON s.id = pe.supplier_id
        WHERE ep.id = pack_id
        AND ep.pack_type = 'ENGINEERED_LOCKED'
        AND pe.status = 'DRAFT'
        AND user_in_org(auth.uid(), s.organization_id)
    )
);

CREATE POLICY "SUPPLIER can update items in LOOSE packs during draft"
ON public.pack_items FOR UPDATE
USING (
    has_role(auth.uid(), 'SUPPLIER') AND
    EXISTS (
        SELECT 1 FROM estimate_packs ep
        JOIN project_estimates pe ON pe.id = ep.estimate_id
        JOIN suppliers s ON s.id = pe.supplier_id
        WHERE ep.id = pack_id
        AND ep.pack_type = 'LOOSE_MODIFIABLE'
        AND pe.status = 'DRAFT'
        AND user_in_org(auth.uid(), s.organization_id)
    )
);

CREATE POLICY "SUPPLIER can delete items from LOOSE packs during draft"
ON public.pack_items FOR DELETE
USING (
    has_role(auth.uid(), 'SUPPLIER') AND
    EXISTS (
        SELECT 1 FROM estimate_packs ep
        JOIN project_estimates pe ON pe.id = ep.estimate_id
        JOIN suppliers s ON s.id = pe.supplier_id
        WHERE ep.id = pack_id
        AND ep.pack_type = 'LOOSE_MODIFIABLE'
        AND pe.status = 'DRAFT'
        AND user_in_org(auth.uid(), s.organization_id)
    )
);

-- Add triggers for updated_at
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_estimates_updated_at
    BEFORE UPDATE ON public.project_estimates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_estimate_packs_updated_at
    BEFORE UPDATE ON public.estimate_packs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pack_items_updated_at
    BEFORE UPDATE ON public.pack_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_projects_organization_id ON public.projects(organization_id);
CREATE INDEX idx_project_estimates_project_id ON public.project_estimates(project_id);
CREATE INDEX idx_project_estimates_supplier_id ON public.project_estimates(supplier_id);
CREATE INDEX idx_project_estimates_status ON public.project_estimates(status);
CREATE INDEX idx_estimate_packs_estimate_id ON public.estimate_packs(estimate_id);
CREATE INDEX idx_pack_items_pack_id ON public.pack_items(pack_id);
CREATE INDEX idx_pack_items_catalog_item_id ON public.pack_items(catalog_item_id);