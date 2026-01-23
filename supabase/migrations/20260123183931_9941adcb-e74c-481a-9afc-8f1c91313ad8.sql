
-- Drop ALL existing versions of these functions
DROP FUNCTION IF EXISTS public.accept_project_invite(uuid);
DROP FUNCTION IF EXISTS public.accept_project_invite(text, uuid, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.get_invite_by_token(text);

-- Drop existing tables if they exist (clean slate for new schema)
DROP TABLE IF EXISTS public.project_contracts CASCADE;
DROP TABLE IF EXISTS public.project_scope_details CASCADE;
DROP TABLE IF EXISTS public.project_invites CASCADE;
DROP TABLE IF EXISTS public.project_team CASCADE;
DROP TABLE IF EXISTS public.trades CASCADE;

-- Create trades lookup table
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert standard trades
INSERT INTO public.trades (name, display_order) VALUES
  ('Framer', 1),
  ('Drywall', 2),
  ('Electrician', 3),
  ('Plumber', 4),
  ('HVAC', 5),
  ('Roofer', 6),
  ('Siding', 7),
  ('Concrete', 8),
  ('Painter', 9),
  ('Flooring', 10),
  ('Cabinets', 11),
  ('Insulation', 12),
  ('Masonry', 13),
  ('Windows/Doors', 14),
  ('Other', 99);

-- Enable RLS on trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trades are viewable by all authenticated users" ON public.trades FOR SELECT TO authenticated USING (true);

-- Create project_team table
CREATE TABLE public.project_team (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('General Contractor', 'Trade Contractor', 'Field Crew', 'Supplier')),
  trade TEXT,
  trade_custom TEXT,
  status TEXT NOT NULL DEFAULT 'Invited' CHECK (status IN ('Invited', 'Accepted', 'Declined')),
  invited_email TEXT,
  invited_name TEXT,
  invited_org_name TEXT,
  invited_by_user_id UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_team
ALTER TABLE public.project_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project team for their projects" ON public.project_team
  FOR SELECT TO authenticated
  USING (
    project_id IN (SELECT project_id FROM public.project_participants)
    OR invited_email IN (SELECT email FROM public.profiles WHERE id = auth.uid())
    OR invited_by_user_id = auth.uid()
    OR user_id = auth.uid()
  );

CREATE POLICY "Project creators can insert team members" ON public.project_team
  FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid())
    OR project_id IN (
      SELECT project_id FROM public.project_participants WHERE organization_id IN (
        SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Project creators can update team members" ON public.project_team
  FOR UPDATE TO authenticated
  USING (
    project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid())
    OR invited_email IN (SELECT email FROM public.profiles WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

-- Create project_invites table for secure invite tokens
CREATE TABLE public.project_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  project_team_id UUID REFERENCES public.project_team(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  trade TEXT,
  trade_custom TEXT,
  invited_email TEXT NOT NULL,
  invited_name TEXT,
  invited_org_name TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'Invited' CHECK (status IN ('Invited', 'Accepted', 'Expired', 'Declined')),
  invited_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days')
);

-- Enable RLS on project_invites
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invites" ON public.project_invites
  FOR SELECT TO authenticated
  USING (
    invited_email IN (SELECT email FROM public.profiles WHERE id = auth.uid())
    OR invited_by_user_id = auth.uid()
  );

CREATE POLICY "Anyone can view invite by token" ON public.project_invites
  FOR SELECT TO anon USING (true);

CREATE POLICY "Users can update invites they received" ON public.project_invites
  FOR UPDATE TO authenticated
  USING (invited_email IN (SELECT email FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Project members can insert invites" ON public.project_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid())
    OR project_id IN (
      SELECT project_id FROM public.project_participants WHERE organization_id IN (
        SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
      )
    )
  );

-- Create project_scope_details table
CREATE TABLE public.project_scope_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  home_type TEXT CHECK (home_type IN ('Custom Home', 'Track Home')),
  floors INTEGER,
  foundation_type TEXT CHECK (foundation_type IN ('Slab', 'Crawl Space', 'Basement')),
  basement_type TEXT CHECK (basement_type IN ('Walkout', 'Garden Level', 'Standard')),
  basement_finish TEXT CHECK (basement_finish IN ('Finished', 'Unfinished', 'Partially Finished')),
  stairs_type TEXT CHECK (stairs_type IN ('Field Built', 'Manufactured', 'Both')),
  has_elevator BOOLEAN DEFAULT false,
  shaft_type TEXT,
  shaft_type_notes TEXT,
  roof_type TEXT CHECK (roof_type IN ('Gable', 'Hip', 'Flat', 'Mixed')),
  has_roof_deck BOOLEAN DEFAULT false,
  roof_deck_type TEXT CHECK (roof_deck_type IN ('Framed', 'Concrete', 'Other')),
  has_covered_porches BOOLEAN DEFAULT false,
  has_balconies BOOLEAN DEFAULT false,
  balcony_type TEXT,
  decking_included BOOLEAN DEFAULT false,
  decking_type TEXT,
  decking_type_other TEXT,
  siding_included BOOLEAN DEFAULT false,
  siding_materials JSONB DEFAULT '[]'::jsonb,
  siding_material_other TEXT,
  decorative_included BOOLEAN DEFAULT false,
  decorative_items JSONB DEFAULT '[]'::jsonb,
  decorative_item_other TEXT,
  fascia_included BOOLEAN DEFAULT false,
  soffit_included BOOLEAN DEFAULT false,
  fascia_soffit_material TEXT,
  fascia_soffit_material_other TEXT,
  windows_included BOOLEAN DEFAULT false,
  wrb_included BOOLEAN DEFAULT false,
  ext_doors_included BOOLEAN DEFAULT false,
  num_buildings INTEGER,
  stories INTEGER,
  construction_type TEXT,
  construction_type_other TEXT,
  num_units INTEGER,
  stories_per_unit INTEGER,
  has_shared_walls BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_scope_details
ALTER TABLE public.project_scope_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scope for their projects" ON public.project_scope_details
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM public.project_participants WHERE organization_id IN (
        SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
      )
    )
    OR project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid())
  );

CREATE POLICY "Project creators can insert scope" ON public.project_scope_details
  FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid()));

CREATE POLICY "Project creators can update scope" ON public.project_scope_details
  FOR UPDATE TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid()));

-- Create project_contracts table
CREATE TABLE public.project_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_org_id UUID REFERENCES public.organizations(id),
  to_org_id UUID REFERENCES public.organizations(id),
  to_project_team_id UUID REFERENCES public.project_team(id),
  from_role TEXT NOT NULL CHECK (from_role IN ('General Contractor', 'Trade Contractor')),
  to_role TEXT NOT NULL CHECK (to_role IN ('Trade Contractor', 'Field Crew', 'Supplier')),
  trade TEXT,
  contract_sum DECIMAL(12,2),
  retainage_percent DECIMAL(5,2) DEFAULT 0,
  allow_mobilization_line_item BOOLEAN DEFAULT false,
  notes TEXT,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_contracts
ALTER TABLE public.project_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contracts for their projects" ON public.project_contracts
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM public.project_participants WHERE organization_id IN (
        SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
      )
    )
    OR from_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())
    OR to_org_id IN (SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Project members can insert contracts" ON public.project_contracts
  FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid())
    OR project_id IN (
      SELECT project_id FROM public.project_participants WHERE organization_id IN (
        SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Contract creators can update contracts" ON public.project_contracts
  FOR UPDATE TO authenticated
  USING (created_by_user_id = auth.uid());

-- Add new columns to projects table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'city') THEN
    ALTER TABLE public.projects ADD COLUMN city TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'state') THEN
    ALTER TABLE public.projects ADD COLUMN state TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'zip') THEN
    ALTER TABLE public.projects ADD COLUMN zip TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'start_date') THEN
    ALTER TABLE public.projects ADD COLUMN start_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'created_by_org_id') THEN
    ALTER TABLE public.projects ADD COLUMN created_by_org_id UUID REFERENCES public.organizations(id);
  END IF;
END $$;
