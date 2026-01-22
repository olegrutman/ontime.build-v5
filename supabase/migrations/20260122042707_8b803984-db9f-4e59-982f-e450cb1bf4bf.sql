-- Create enum for organization types
CREATE TYPE public.org_type AS ENUM ('GC', 'TC', 'SUPPLIER');

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('GC_PM', 'TC_PM', 'FS', 'SUPPLIER');

-- Create organizations table
CREATE TABLE public.organizations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    org_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type org_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user information
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_org_roles table (many-to-many with role)
CREATE TABLE public.user_org_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, organization_id)
);

-- Create org_invitations table for org_code based invites
CREATE TABLE public.org_invitations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role app_role NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_org_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has a specific role in any org
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
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
          AND role = _role
    )
$$;

-- Security definer function to check if user belongs to an organization
CREATE OR REPLACE FUNCTION public.user_in_org(_user_id UUID, _org_id UUID)
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
          AND organization_id = _org_id
    )
$$;

-- Security definer function to get user's role in an organization
CREATE OR REPLACE FUNCTION public.get_user_role_in_org(_user_id UUID, _org_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_org_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
    LIMIT 1
$$;

-- Security definer function to check if user is GC_PM or TC_PM (not FS)
CREATE OR REPLACE FUNCTION public.is_pm_role(_user_id UUID)
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

-- RLS Policies for organizations
-- Anyone authenticated can view orgs they belong to
CREATE POLICY "Users can view their organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (public.user_in_org(auth.uid(), id));

-- Only GC_PM and TC_PM can create organizations
CREATE POLICY "PMs can create organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users in same org can view each other's profiles
CREATE POLICY "Org members can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_org_roles uor1
        JOIN public.user_org_roles uor2 ON uor1.organization_id = uor2.organization_id
        WHERE uor1.user_id = auth.uid() AND uor2.user_id = profiles.user_id
    )
);

-- RLS Policies for user_org_roles
-- Users can view roles in their organizations
CREATE POLICY "Users can view org roles"
ON public.user_org_roles FOR SELECT
TO authenticated
USING (public.user_in_org(auth.uid(), organization_id));

-- Only PMs can insert roles
CREATE POLICY "PMs can insert org roles"
ON public.user_org_roles FOR INSERT
TO authenticated
WITH CHECK (public.is_pm_role(auth.uid()) OR user_id = auth.uid());

-- RLS Policies for org_invitations
-- Users can view invitations for their orgs (only PMs)
CREATE POLICY "PMs can view org invitations"
ON public.org_invitations FOR SELECT
TO authenticated
USING (
    public.user_in_org(auth.uid(), organization_id) 
    AND public.is_pm_role(auth.uid())
);

-- Users can view invitations sent to their email
CREATE POLICY "Users can view their invitations"
ON public.org_invitations FOR SELECT
TO authenticated
USING (
    email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
);

-- PMs can create invitations for their orgs
CREATE POLICY "PMs can create invitations"
ON public.org_invitations FOR INSERT
TO authenticated
WITH CHECK (
    public.user_in_org(auth.uid(), organization_id)
    AND public.is_pm_role(auth.uid())
);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();