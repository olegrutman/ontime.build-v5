-- Profile Settings Migration
-- Adds personal preferences, org settings, user settings, and identity fields

-- 1) Add personal preference fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Denver',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS job_title TEXT;

-- 2) Add organization identity fields
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS trade TEXT,
ADD COLUMN IF NOT EXISTS trade_custom TEXT,
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_expiration_date DATE;

-- 3) Create org_settings table for pricing defaults
CREATE TABLE IF NOT EXISTS public.org_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
    default_hourly_rate DECIMAL(10,2),
    labor_markup_percent DECIMAL(5,2),
    minimum_service_charge DECIMAL(10,2),
    default_crew_size INTEGER,
    default_workday_hours DECIMAL(4,2) DEFAULT 8,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on org_settings
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

-- Org members can view their org settings
CREATE POLICY "Org members can view their org settings"
ON public.org_settings FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_org_roles uor
        WHERE uor.organization_id = org_settings.organization_id
        AND uor.user_id = auth.uid()
    )
);

-- Org managers can update their org settings
CREATE POLICY "Org managers can update their org settings"
ON public.org_settings FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_org_roles uor
        WHERE uor.organization_id = org_settings.organization_id
        AND uor.user_id = auth.uid()
        AND uor.role IN ('GC_PM', 'TC_PM', 'FC_PM')
    )
);

-- Org managers can insert their org settings
CREATE POLICY "Org managers can insert their org settings"
ON public.org_settings FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_org_roles uor
        WHERE uor.organization_id = org_settings.organization_id
        AND uor.user_id = auth.uid()
        AND uor.role IN ('GC_PM', 'TC_PM', 'FC_PM')
    )
);

-- 4) Create user_settings table for notification preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    notify_email BOOLEAN DEFAULT true,
    notify_sms BOOLEAN DEFAULT false,
    notify_change_orders BOOLEAN DEFAULT true,
    notify_invoices BOOLEAN DEFAULT true,
    notify_invites BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view their own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update their own settings"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert their own settings"
ON public.user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5) Create function to check if user is on active projects
CREATE OR REPLACE FUNCTION public.user_has_active_projects(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.project_team pt
        WHERE pt.user_id = _user_id
        AND pt.status = 'accepted'
    )
$$;

-- 6) Create trigger for org_settings updated_at
CREATE OR REPLACE TRIGGER update_org_settings_updated_at
    BEFORE UPDATE ON public.org_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Create trigger for user_settings updated_at
CREATE OR REPLACE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();