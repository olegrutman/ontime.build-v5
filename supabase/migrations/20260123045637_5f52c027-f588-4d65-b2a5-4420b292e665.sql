-- 1. Add FC to org_type enum
ALTER TYPE public.org_type ADD VALUE IF NOT EXISTS 'FC';

-- 2. Add role column to project_participants (to track GC/TC/FC/SUPPLIER role)
ALTER TABLE public.project_participants 
ADD COLUMN IF NOT EXISTS role public.org_type;

-- 3. Add invited_by_user_id to track who invited (for audit, rename from invited_by)
-- The invited_by column already exists, we just need to ensure it's clear

-- 4. Create project_relationships table
CREATE TABLE IF NOT EXISTS public.project_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  upstream_participant_id uuid NOT NULL REFERENCES public.project_participants(id) ON DELETE CASCADE,
  downstream_participant_id uuid NOT NULL REFERENCES public.project_participants(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('GC_TC', 'TC_FC', 'BUYER_SUPPLIER')),
  billing_direction text NOT NULL DEFAULT 'DOWNSTREAM_TO_UPSTREAM',
  material_responsibility text CHECK (material_responsibility IN ('GC', 'TC', NULL)),
  po_requires_upstream_approval boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, upstream_participant_id, downstream_participant_id)
);

-- Enable RLS on project_relationships
ALTER TABLE public.project_relationships ENABLE ROW LEVEL SECURITY;

-- 5. RLS for project_relationships: users can SELECT if their org is a participant
CREATE POLICY "Participants can view project relationships"
ON public.project_relationships
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_participants pp
    WHERE (pp.id = project_relationships.upstream_participant_id 
           OR pp.id = project_relationships.downstream_participant_id)
      AND user_in_org(auth.uid(), pp.organization_id)
  )
);

-- 6. GC_PM can insert relationships for their projects
CREATE POLICY "GC_PM can create project relationships"
ON public.project_relationships
FOR INSERT
WITH CHECK (
  is_gc_pm(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_relationships.project_id
      AND user_in_org(auth.uid(), p.organization_id)
  )
);

-- 7. GC_PM can update relationships for their projects
CREATE POLICY "GC_PM can update project relationships"
ON public.project_relationships
FOR UPDATE
USING (
  is_gc_pm(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_relationships.project_id
      AND user_in_org(auth.uid(), p.organization_id)
  )
);

-- 8. GC_PM can delete relationships for their projects
CREATE POLICY "GC_PM can delete project relationships"
ON public.project_relationships
FOR DELETE
USING (
  is_gc_pm(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_relationships.project_id
      AND user_in_org(auth.uid(), p.organization_id)
  )
);

-- 9. Update project_participants RLS to allow participants to view their own participation
-- (Already exists, but add policy for TC_PM to manage their own invites)

-- 10. Create function to auto-create relationships when invite is accepted
CREATE OR REPLACE FUNCTION public.create_relationship_on_accept()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _project projects;
  _gc_participant project_participants;
  _tc_participant project_participants;
  _accepted_role org_type;
BEGIN
  -- Only trigger when status changes to ACCEPTED
  IF NEW.invite_status = 'ACCEPTED' AND (OLD.invite_status IS NULL OR OLD.invite_status != 'ACCEPTED') THEN
    -- Get the project
    SELECT * INTO _project FROM projects WHERE id = NEW.project_id;
    
    -- Get the role of the accepted participant
    SELECT o.type INTO _accepted_role FROM organizations o WHERE o.id = NEW.organization_id;
    
    -- Get GC participant (project owner is always GC)
    SELECT * INTO _gc_participant 
    FROM project_participants 
    WHERE project_id = NEW.project_id 
      AND organization_id = _project.organization_id;
    
    -- If a TC accepted, create GC->TC relationship
    IF _accepted_role = 'TC' THEN
      INSERT INTO project_relationships (
        project_id,
        upstream_participant_id,
        downstream_participant_id,
        relationship_type,
        material_responsibility,
        po_requires_upstream_approval
      ) VALUES (
        NEW.project_id,
        _gc_participant.id,
        NEW.id,
        'GC_TC',
        COALESCE((SELECT parties->0->>'material_responsibility' FROM projects WHERE id = NEW.project_id), 'TC'),
        false
      )
      ON CONFLICT (project_id, upstream_participant_id, downstream_participant_id) DO NOTHING;
    
    -- If an FC accepted, find the TC that invited them and create TC->FC relationship
    ELSIF _accepted_role = 'FC' THEN
      -- Find the TC participant who created the project or is the primary TC
      SELECT * INTO _tc_participant 
      FROM project_participants 
      WHERE project_id = NEW.project_id 
        AND role = 'TC'
        AND invite_status = 'ACCEPTED'
      LIMIT 1;
      
      IF _tc_participant.id IS NOT NULL THEN
        INSERT INTO project_relationships (
          project_id,
          upstream_participant_id,
          downstream_participant_id,
          relationship_type
        ) VALUES (
          NEW.project_id,
          _tc_participant.id,
          NEW.id,
          'TC_FC'
        )
        ON CONFLICT (project_id, upstream_participant_id, downstream_participant_id) DO NOTHING;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 11. Create trigger for auto-creating relationships
DROP TRIGGER IF EXISTS on_participant_accepted ON public.project_participants;
CREATE TRIGGER on_participant_accepted
  AFTER UPDATE ON public.project_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.create_relationship_on_accept();

-- 12. RPC to invite an org to a project
CREATE OR REPLACE FUNCTION public.invite_org_to_project(
  _project_id uuid,
  _org_code text,
  _role text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id uuid := auth.uid();
  _org organizations;
  _participant_id uuid;
BEGIN
  -- Validate role
  IF _role NOT IN ('GC', 'TC', 'FC', 'SUPPLIER') THEN
    RAISE EXCEPTION 'Invalid role: %', _role;
  END IF;
  
  -- Find the organization
  SELECT * INTO _org FROM organizations WHERE org_code = upper(trim(_org_code));
  
  IF _org IS NULL THEN
    RAISE EXCEPTION 'Organization not found with code: %', _org_code;
  END IF;
  
  -- Check if already a participant
  IF EXISTS (SELECT 1 FROM project_participants WHERE project_id = _project_id AND organization_id = _org.id) THEN
    RAISE EXCEPTION 'Organization is already a participant';
  END IF;
  
  -- Insert participant
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status)
  VALUES (_project_id, _org.id, _role::org_type, _user_id, 'INVITED')
  RETURNING id INTO _participant_id;
  
  RETURN _participant_id;
END;
$$;

-- 13. Update decline_project_invite to also set status
CREATE OR REPLACE FUNCTION public.decline_project_invite(_project_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id uuid := auth.uid();
  _user_org_id uuid;
BEGIN
  SELECT organization_id INTO _user_org_id FROM user_org_roles WHERE user_id = _user_id LIMIT 1;
  
  IF NOT is_pm_role(_user_id) THEN
    RAISE EXCEPTION 'Only PM roles can decline invites';
  END IF;
  
  UPDATE project_participants
  SET invite_status = 'DECLINED'
  WHERE project_id = _project_id 
    AND organization_id = _user_org_id
    AND invite_status = 'INVITED';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending invite found';
  END IF;
END;
$$;

-- 14. RPC to get project relationships
CREATE OR REPLACE FUNCTION public.get_project_relationships(_project_id uuid)
RETURNS TABLE (
  id uuid,
  upstream_org_name text,
  upstream_org_code text,
  upstream_role org_type,
  downstream_org_name text,
  downstream_org_code text,
  downstream_role org_type,
  relationship_type text,
  material_responsibility text,
  po_requires_upstream_approval boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    up_org.name as upstream_org_name,
    up_org.org_code as upstream_org_code,
    up_pp.role as upstream_role,
    down_org.name as downstream_org_name,
    down_org.org_code as downstream_org_code,
    down_pp.role as downstream_role,
    pr.relationship_type,
    pr.material_responsibility,
    pr.po_requires_upstream_approval
  FROM project_relationships pr
  JOIN project_participants up_pp ON up_pp.id = pr.upstream_participant_id
  JOIN organizations up_org ON up_org.id = up_pp.organization_id
  JOIN project_participants down_pp ON down_pp.id = pr.downstream_participant_id
  JOIN organizations down_org ON down_org.id = down_pp.organization_id
  WHERE pr.project_id = _project_id
    AND EXISTS (
      SELECT 1 FROM project_participants pp
      WHERE pp.project_id = _project_id
        AND user_in_org(auth.uid(), pp.organization_id)
    );
END;
$$;

-- 15. Add FC_PM role to app_role enum if needed for future
-- ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'FC_PM';

-- 16. Extend notifications for project invites to include role
-- The existing notification system will work, just needs the entity context