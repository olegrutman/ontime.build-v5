-- Create enum for catalog categories
CREATE TYPE public.catalog_category AS ENUM (
    'Dimensional',
    'Engineered', 
    'Sheathing',
    'Hardware',
    'Fasteners',
    'Other'
);

-- Create suppliers table
CREATE TABLE public.suppliers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    supplier_code TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(organization_id, supplier_code)
);

-- Create catalog_items table
CREATE TABLE public.catalog_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    supplier_sku TEXT NOT NULL,
    category catalog_category NOT NULL DEFAULT 'Other',
    description TEXT NOT NULL,
    uom_default TEXT NOT NULL DEFAULT 'EA',
    size_or_spec TEXT,
    search_keywords TEXT[],
    search_vector tsvector,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(supplier_id, supplier_sku)
);

-- Create indexes
CREATE INDEX catalog_items_search_idx ON public.catalog_items USING GIN (search_vector);
CREATE INDEX catalog_items_category_idx ON public.catalog_items (category);
CREATE INDEX catalog_items_supplier_idx ON public.catalog_items (supplier_id);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

-- Function to update search vector
CREATE OR REPLACE FUNCTION public.update_catalog_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', coalesce(NEW.supplier_sku, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(array_to_string(NEW.search_keywords, ' '), '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for search vector
CREATE TRIGGER catalog_items_search_vector_update
BEFORE INSERT OR UPDATE ON public.catalog_items
FOR EACH ROW EXECUTE FUNCTION public.update_catalog_search_vector();

-- Security definer function to check if user is GC_PM in any org
CREATE OR REPLACE FUNCTION public.is_gc_pm(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_org_roles
        WHERE user_id = _user_id
          AND role = 'GC_PM'
    )
$$;

-- Security definer function to get user's org id
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id
    FROM public.user_org_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- RLS Policies for suppliers
CREATE POLICY "GC_PM can create suppliers"
ON public.suppliers FOR INSERT
TO authenticated
WITH CHECK (
    public.is_gc_pm(auth.uid()) 
    AND organization_id = public.get_user_org_id(auth.uid())
);

CREATE POLICY "Org members can view suppliers"
ON public.suppliers FOR SELECT
TO authenticated
USING (public.user_in_org(auth.uid(), organization_id));

CREATE POLICY "GC_PM can update suppliers"
ON public.suppliers FOR UPDATE
TO authenticated
USING (
    public.is_gc_pm(auth.uid()) 
    AND organization_id = public.get_user_org_id(auth.uid())
);

CREATE POLICY "GC_PM can delete suppliers"
ON public.suppliers FOR DELETE
TO authenticated
USING (
    public.is_gc_pm(auth.uid()) 
    AND organization_id = public.get_user_org_id(auth.uid())
);

-- RLS Policies for catalog_items
CREATE POLICY "GC_PM can insert catalog items"
ON public.catalog_items FOR INSERT
TO authenticated
WITH CHECK (
    public.is_gc_pm(auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.suppliers s
        WHERE s.id = catalog_items.supplier_id
        AND s.organization_id = public.get_user_org_id(auth.uid())
    )
);

CREATE POLICY "Org members can view catalog items"
ON public.catalog_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.suppliers s
        WHERE s.id = catalog_items.supplier_id
        AND public.user_in_org(auth.uid(), s.organization_id)
    )
);

CREATE POLICY "GC_PM can update catalog items"
ON public.catalog_items FOR UPDATE
TO authenticated
USING (
    public.is_gc_pm(auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.suppliers s
        WHERE s.id = catalog_items.supplier_id
        AND s.organization_id = public.get_user_org_id(auth.uid())
    )
);

CREATE POLICY "GC_PM can delete catalog items"
ON public.catalog_items FOR DELETE
TO authenticated
USING (
    public.is_gc_pm(auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.suppliers s
        WHERE s.id = catalog_items.supplier_id
        AND s.organization_id = public.get_user_org_id(auth.uid())
    )
);

-- Triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_catalog_items_updated_at
BEFORE UPDATE ON public.catalog_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to search catalog items with full-text search
CREATE OR REPLACE FUNCTION public.search_catalog(
    search_query TEXT,
    category_filter TEXT DEFAULT NULL,
    supplier_filter UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    supplier_id UUID,
    supplier_sku TEXT,
    category catalog_category,
    description TEXT,
    uom_default TEXT,
    size_or_spec TEXT,
    search_keywords TEXT[],
    rank REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ci.id,
        ci.supplier_id,
        ci.supplier_sku,
        ci.category,
        ci.description,
        ci.uom_default,
        ci.size_or_spec,
        ci.search_keywords,
        CASE 
            WHEN search_query IS NULL OR search_query = '' THEN 0::REAL
            ELSE ts_rank(ci.search_vector, websearch_to_tsquery('english', search_query))
        END as rank
    FROM public.catalog_items ci
    JOIN public.suppliers s ON s.id = ci.supplier_id
    WHERE 
        (search_query IS NULL OR search_query = '' OR ci.search_vector @@ websearch_to_tsquery('english', search_query))
        AND (category_filter IS NULL OR ci.category::TEXT = category_filter)
        AND (supplier_filter IS NULL OR ci.supplier_id = supplier_filter)
        AND public.user_in_org(auth.uid(), s.organization_id)
    ORDER BY rank DESC, ci.description ASC
    LIMIT 100;
END;
$$;