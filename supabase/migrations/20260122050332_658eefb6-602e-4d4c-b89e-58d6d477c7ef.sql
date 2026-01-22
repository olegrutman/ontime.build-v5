-- Add rejection_notes to work_items for tracking rejection reasons
ALTER TABLE public.work_items 
ADD COLUMN rejection_notes TEXT,
ADD COLUMN amount NUMERIC,
ADD COLUMN code TEXT;

-- Create work_item_participants junction table for inviting orgs to change work
CREATE TABLE public.work_item_participants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL,
    invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(work_item_id, organization_id)
);

-- Enable RLS on work_item_participants
ALTER TABLE public.work_item_participants ENABLE ROW LEVEL SECURITY;

-- Policies for work_item_participants
CREATE POLICY "Users can view participants for accessible work items"
ON public.work_item_participants
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = work_item_participants.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
    )
    OR user_in_org(auth.uid(), organization_id)
);

CREATE POLICY "PM roles can invite participants to their work items"
ON public.work_item_participants
FOR INSERT
WITH CHECK (
    is_pm_role(auth.uid()) AND
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = work_item_participants.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
    )
);

CREATE POLICY "PM roles can remove participants from their work items"
ON public.work_item_participants
FOR DELETE
USING (
    is_pm_role(auth.uid()) AND
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = work_item_participants.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
    )
);

-- Create change_work_pricing table for tracking pricing breakdown
CREATE TABLE public.change_work_pricing (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    uom TEXT NOT NULL DEFAULT 'EA',
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on change_work_pricing
ALTER TABLE public.change_work_pricing ENABLE ROW LEVEL SECURITY;

-- Policies for change_work_pricing (only visible to PM roles, not FS)
CREATE POLICY "PM roles can view pricing for accessible work items"
ON public.change_work_pricing
FOR SELECT
USING (
    is_pm_role(auth.uid()) AND
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = change_work_pricing.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
    )
);

CREATE POLICY "TC_PM can insert pricing for draft change work"
ON public.change_work_pricing
FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'TC_PM') AND
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = change_work_pricing.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
        AND wi.state = 'OPEN'
        AND wi.item_type = 'CHANGE_WORK'
    )
);

CREATE POLICY "TC_PM can update pricing for draft change work"
ON public.change_work_pricing
FOR UPDATE
USING (
    has_role(auth.uid(), 'TC_PM') AND
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = change_work_pricing.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
        AND wi.state = 'OPEN'
        AND wi.item_type = 'CHANGE_WORK'
    )
);

CREATE POLICY "TC_PM can delete pricing for draft change work"
ON public.change_work_pricing
FOR DELETE
USING (
    has_role(auth.uid(), 'TC_PM') AND
    EXISTS (
        SELECT 1 FROM work_items wi 
        WHERE wi.id = change_work_pricing.work_item_id 
        AND user_in_org(auth.uid(), wi.organization_id)
        AND wi.state = 'OPEN'
        AND wi.item_type = 'CHANGE_WORK'
    )
);

-- Function to generate change work code
CREATE OR REPLACE FUNCTION public.generate_change_work_code(org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_seq INTEGER;
    org_code_val TEXT;
BEGIN
    -- Get org code
    SELECT org_code INTO org_code_val FROM organizations WHERE id = org_id;
    
    -- Count existing change work items for this org
    SELECT COUNT(*) + 1 INTO next_seq
    FROM work_items
    WHERE organization_id = org_id AND item_type = 'CHANGE_WORK';
    
    RETURN 'CO-' || org_code_val || '-' || LPAD(next_seq::TEXT, 3, '0');
END;
$$;

-- Function to auto-generate SOV items when change work is executed
CREATE OR REPLACE FUNCTION public.execute_change_work(change_work_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cw_record RECORD;
    pricing_record RECORD;
    sov_code TEXT;
    sov_counter INTEGER := 1;
BEGIN
    -- Get the change work item
    SELECT * INTO cw_record FROM work_items WHERE id = change_work_id AND item_type = 'CHANGE_WORK';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Change work item not found';
    END IF;
    
    IF cw_record.state != 'APPROVED' THEN
        RAISE EXCEPTION 'Change work must be APPROVED to execute';
    END IF;
    
    -- Create SOV items from pricing breakdown
    FOR pricing_record IN 
        SELECT * FROM change_work_pricing 
        WHERE work_item_id = change_work_id 
        ORDER BY sort_order
    LOOP
        sov_code := cw_record.code || '-' || CHR(64 + sov_counter); -- A, B, C...
        
        INSERT INTO work_items (
            organization_id,
            project_id,
            parent_work_item_id,
            item_type,
            state,
            title,
            description,
            code,
            amount,
            location_ref,
            created_by
        ) VALUES (
            cw_record.organization_id,
            cw_record.project_id,
            change_work_id,
            'SOV_ITEM',
            'EXECUTED',
            pricing_record.description,
            pricing_record.notes,
            sov_code,
            pricing_record.quantity * pricing_record.unit_price,
            cw_record.location_ref,
            cw_record.created_by
        );
        
        sov_counter := sov_counter + 1;
    END LOOP;
    
    -- Update change work to EXECUTED
    UPDATE work_items 
    SET state = 'EXECUTED', updated_at = now()
    WHERE id = change_work_id;
END;
$$;