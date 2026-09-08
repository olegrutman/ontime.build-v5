-- 1. Relax check constraints to accept both old and new wording
ALTER TABLE public.project_team DROP CONSTRAINT IF EXISTS project_team_role_check;
ALTER TABLE public.project_team ADD CONSTRAINT project_team_role_check
  CHECK (role = ANY (ARRAY['General Contractor','Trade Contractor','Subcontractor','Field Crew','Crew','Supplier']));

ALTER TABLE public.project_contracts DROP CONSTRAINT IF EXISTS project_contracts_from_role_check;
ALTER TABLE public.project_contracts ADD CONSTRAINT project_contracts_from_role_check
  CHECK (from_role = ANY (ARRAY['Owner','General Contractor','Trade Contractor','Subcontractor','Field Crew','Crew','Supplier']));

ALTER TABLE public.project_contracts DROP CONSTRAINT IF EXISTS project_contracts_to_role_check;
ALTER TABLE public.project_contracts ADD CONSTRAINT project_contracts_to_role_check
  CHECK (to_role = ANY (ARRAY['Owner','General Contractor','Trade Contractor','Subcontractor','Field Crew','Crew','Supplier']));

ALTER TABLE public.project_scope_assignments DROP CONSTRAINT IF EXISTS project_scope_assignments_assigned_role_check;
ALTER TABLE public.project_scope_assignments ADD CONSTRAINT project_scope_assignments_assigned_role_check
  CHECK (assigned_role = ANY (ARRAY['Trade Contractor','Subcontractor','Field Crew','Crew']));

-- 2. Rewrite existing data to the new wording
UPDATE public.project_team SET role = 'Subcontractor' WHERE role = 'Trade Contractor';
UPDATE public.project_team SET role = 'Crew' WHERE role = 'Field Crew';
UPDATE public.project_contracts SET from_role = 'Subcontractor' WHERE from_role = 'Trade Contractor';
UPDATE public.project_contracts SET from_role = 'Crew' WHERE from_role = 'Field Crew';
UPDATE public.project_contracts SET to_role = 'Subcontractor' WHERE to_role = 'Trade Contractor';
UPDATE public.project_contracts SET to_role = 'Crew' WHERE to_role = 'Field Crew';
UPDATE public.project_invites SET role = 'Subcontractor' WHERE role = 'Trade Contractor';
UPDATE public.project_invites SET role = 'Crew' WHERE role = 'Field Crew';
UPDATE public.project_scope_assignments SET assigned_role = 'Subcontractor' WHERE assigned_role = 'Trade Contractor';
UPDATE public.project_scope_assignments SET assigned_role = 'Crew' WHERE assigned_role = 'Field Crew';

-- 3. Regenerate functions that hard-code the old wording, accepting both spellings
DO $do$
DECLARE
  r record;
  newdef text;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.prosrc LIKE '%Trade Contractor%' OR p.prosrc LIKE '%Field Crew%')
  LOOP
    newdef := pg_get_functiondef(r.oid);
    newdef := replace(newdef, 'Trade Contractors', 'Subcontractors');
    newdef := replace(newdef, 'Trade Contractor', 'Subcontractor');
    newdef := replace(newdef, 'Field Crews', 'Crews');
    newdef := replace(newdef, 'Field Crew', 'Crew');
    EXECUTE newdef;
  END LOOP;
END
$do$;