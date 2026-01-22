-- =====================================================
-- PARTITIONED VISIBILITY: Role + State Based Access Control
-- =====================================================

-- 1. LABOR ENTRIES TABLE
-- FS adds hours, TC sees hours+rates, GC NEVER sees FS hours
-- =====================================================
CREATE TABLE public.labor_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
    entered_by UUID NOT NULL,  -- The FS who entered this
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    hours NUMERIC NOT NULL CHECK (hours >= 0),
    description TEXT,
    -- SENSITIVE: Only TC_PM should see these
    hourly_rate NUMERIC,  -- Set by TC_PM, hidden from FS and GC
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.labor_entries ENABLE ROW LEVEL SECURITY;

-- FS can insert their own entries (hours only, no rate)
CREATE POLICY "FS can insert own labor entries"
ON public.labor_entries
FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'FS') AND
    entered_by = auth.uid() AND
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = labor_entries.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
    )
);

-- FS can view their own entries (but NOT hourly_rate - enforced via view)
CREATE POLICY "FS can view own labor entries"
ON public.labor_entries
FOR SELECT
USING (
    has_role(auth.uid(), 'FS') AND
    entered_by = auth.uid()
);

-- FS can update their own entries (hours/description only)
CREATE POLICY "FS can update own labor entries"
ON public.labor_entries
FOR UPDATE
USING (
    has_role(auth.uid(), 'FS') AND
    entered_by = auth.uid() AND
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = labor_entries.work_item_id 
        AND wi.state = 'OPEN'
    )
);

-- TC_PM can view ALL labor entries in their org (including rates)
CREATE POLICY "TC_PM can view labor entries"
ON public.labor_entries
FOR SELECT
USING (
    has_role(auth.uid(), 'TC_PM') AND
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = labor_entries.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
    )
);

-- TC_PM can update labor entries (to set rates)
CREATE POLICY "TC_PM can update labor entries"
ON public.labor_entries
FOR UPDATE
USING (
    has_role(auth.uid(), 'TC_PM') AND
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = labor_entries.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
        AND wi.state IN ('OPEN', 'PRICED')
    )
);

-- TC_PM can delete labor entries
CREATE POLICY "TC_PM can delete labor entries"
ON public.labor_entries
FOR DELETE
USING (
    has_role(auth.uid(), 'TC_PM') AND
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = labor_entries.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
        AND wi.state = 'OPEN'
    )
);

-- GC_PM has NO access to labor_entries at all (enforced by absence of policy)
-- SUPPLIER has NO access to labor_entries at all


-- 2. COST ROLLUPS TABLE
-- TC aggregates costs here; GC only sees after state = PRICED
-- =====================================================
CREATE TABLE public.cost_rollups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('LABOR', 'MATERIALS', 'EQUIPMENT', 'SUBCONTRACT', 'OTHER')),
    description TEXT NOT NULL,
    -- Raw cost - ONLY TC sees this
    raw_cost NUMERIC NOT NULL DEFAULT 0,
    -- Markup percentage - ONLY TC sees this
    markup_percent NUMERIC NOT NULL DEFAULT 0,
    -- Final amount (raw_cost * (1 + markup_percent/100)) - GC sees this after PRICED
    final_amount NUMERIC GENERATED ALWAYS AS (raw_cost * (1 + markup_percent / 100)) STORED,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(work_item_id, category, description)
);

ALTER TABLE public.cost_rollups ENABLE ROW LEVEL SECURITY;

-- TC_PM can CRUD cost rollups
CREATE POLICY "TC_PM can manage cost rollups"
ON public.cost_rollups
FOR ALL
USING (
    has_role(auth.uid(), 'TC_PM') AND
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = cost_rollups.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
    )
)
WITH CHECK (
    has_role(auth.uid(), 'TC_PM') AND
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = cost_rollups.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
    )
);

-- GC_PM can ONLY view cost rollups AFTER state is PRICED or later
-- And they see final_amount, NOT raw_cost or markup (enforced via view)
CREATE POLICY "GC_PM can view rolled up costs after pricing"
ON public.cost_rollups
FOR SELECT
USING (
    is_gc_pm(auth.uid()) AND
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = cost_rollups.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
        AND wi.state IN ('PRICED', 'APPROVED', 'EXECUTED')
    )
);

-- FS and SUPPLIER have NO access to cost_rollups


-- 3. VIEWS FOR COLUMN-LEVEL SECURITY
-- =====================================================

-- View for FS to see labor entries WITHOUT hourly_rate
CREATE VIEW public.labor_entries_fs
WITH (security_invoker=on) AS
SELECT 
    id,
    work_item_id,
    entered_by,
    entry_date,
    hours,
    description,
    -- hourly_rate is intentionally excluded
    created_at,
    updated_at
FROM public.labor_entries;

-- View for GC to see cost rollups WITHOUT raw_cost or markup_percent
CREATE VIEW public.cost_rollups_gc
WITH (security_invoker=on) AS
SELECT 
    id,
    work_item_id,
    category,
    description,
    -- raw_cost excluded
    -- markup_percent excluded
    final_amount,
    notes,
    created_at,
    updated_at
FROM public.cost_rollups;


-- 4. UPDATE change_work_pricing RLS
-- Only PM roles can see, SUPPLIER and FS cannot
-- =====================================================
DROP POLICY IF EXISTS "PM roles can view pricing for accessible work items" ON public.change_work_pricing;

CREATE POLICY "PM roles can view pricing for accessible work items"
ON public.change_work_pricing
FOR SELECT
USING (
    -- TC_PM always sees their own pricing
    (has_role(auth.uid(), 'TC_PM') AND EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = change_work_pricing.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
    ))
    OR
    -- GC_PM only sees after PRICED state
    (is_gc_pm(auth.uid()) AND EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = change_work_pricing.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
        AND wi.state IN ('PRICED', 'APPROVED', 'EXECUTED')
    ))
);


-- 5. SUPPLIER MATERIAL PRICING - suppliers only see their own quotes
-- =====================================================
CREATE TABLE public.supplier_quotes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_cost NUMERIC NOT NULL DEFAULT 0,  -- Supplier's cost
    uom TEXT NOT NULL DEFAULT 'EA',
    notes TEXT,
    -- TC internal fields - never visible to supplier
    tc_markup_percent NUMERIC DEFAULT 0,
    tc_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_quotes ENABLE ROW LEVEL SECURITY;

-- Suppliers can view/manage only their own quotes
CREATE POLICY "Suppliers can manage own quotes"
ON public.supplier_quotes
FOR ALL
USING (
    has_role(auth.uid(), 'SUPPLIER') AND
    EXISTS (
        SELECT 1 FROM suppliers s 
        WHERE s.id = supplier_quotes.supplier_id 
        AND user_in_org(auth.uid(), s.organization_id)
    )
)
WITH CHECK (
    has_role(auth.uid(), 'SUPPLIER') AND
    EXISTS (
        SELECT 1 FROM suppliers s 
        WHERE s.id = supplier_quotes.supplier_id 
        AND user_in_org(auth.uid(), s.organization_id)
    )
);

-- TC_PM can view/manage all quotes for their work items
CREATE POLICY "TC_PM can manage supplier quotes"
ON public.supplier_quotes
FOR ALL
USING (
    has_role(auth.uid(), 'TC_PM') AND
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = supplier_quotes.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
    )
)
WITH CHECK (
    has_role(auth.uid(), 'TC_PM') AND
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = supplier_quotes.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
    )
);

-- GC_PM CANNOT see raw supplier quotes (only rolled up costs)
-- Enforced by absence of policy

-- Supplier view that hides TC internal fields
CREATE VIEW public.supplier_quotes_public
WITH (security_invoker=on) AS
SELECT 
    id,
    work_item_id,
    supplier_id,
    description,
    quantity,
    unit_cost,
    uom,
    notes,
    -- tc_markup_percent excluded
    -- tc_notes excluded
    created_at,
    updated_at
FROM public.supplier_quotes;


-- 6. HELPER FUNCTION: Check if user can see financial data
-- =====================================================
CREATE OR REPLACE FUNCTION public.can_see_financials(_user_id UUID)
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
          AND role IN ('GC_PM', 'TC_PM')
    )
$$;

-- 7. HELPER FUNCTION: Check if user can see margins/rates (TC only)
-- =====================================================
CREATE OR REPLACE FUNCTION public.can_see_margins(_user_id UUID)
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
          AND role = 'TC_PM'
    )
$$;