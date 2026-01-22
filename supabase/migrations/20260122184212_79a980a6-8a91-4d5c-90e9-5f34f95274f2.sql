
-- Add columns to projects table for wizard data
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'residential';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS build_type TEXT DEFAULT 'new_construction';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS address JSONB;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS structures JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS scope JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS parties JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS mobilization_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS retainage_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create trusted_partners table for Partner Directory
CREATE TABLE IF NOT EXISTS public.trusted_partners (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    partner_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(organization_id, partner_org_id)
);

-- Enable RLS on trusted_partners
ALTER TABLE public.trusted_partners ENABLE ROW LEVEL SECURITY;

-- Policies for trusted_partners (only users in the organization can see/manage their trusted partners)
CREATE POLICY "Users can view their org trusted partners"
ON public.trusted_partners FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can add trusted partners for their org"
ON public.trusted_partners FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete trusted partners from their org"
ON public.trusted_partners FOR DELETE
USING (
    organization_id IN (
        SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
    )
);
