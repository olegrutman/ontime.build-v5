-- Update create_relationship_on_accept to also handle SUPPLIER relationships
CREATE OR REPLACE FUNCTION public.create_relationship_on_accept()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _project projects;
  _gc_participant project_participants;
  _tc_participant project_participants;
  _accepted_role org_type;
  _material_resp text;
  _buyer_participant_id uuid;
BEGIN
  -- Only trigger when status changes to ACCEPTED
  IF NEW.invite_status = 'ACCEPTED' AND (OLD.invite_status IS NULL OR OLD.invite_status != 'ACCEPTED') THEN
    -- Get the project
    SELECT * INTO _project FROM projects WHERE id = NEW.project_id;
    
    -- Get the role of the accepted participant
    SELECT o.type INTO _accepted_role FROM organizations o WHERE o.id = NEW.organization_id;
    
    -- Get GC participant (project owner is always GC, or find the GC participant)
    SELECT * INTO _gc_participant 
    FROM project_participants 
    WHERE project_id = NEW.project_id 
      AND role = 'GC'
      AND invite_status = 'ACCEPTED'
    LIMIT 1;
    
    -- If no GC found yet, check if project owner is the GC
    IF _gc_participant.id IS NULL THEN
      SELECT * INTO _gc_participant 
      FROM project_participants 
      WHERE project_id = NEW.project_id 
        AND organization_id = _project.organization_id
      LIMIT 1;
    END IF;
    
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
    
    -- If a SUPPLIER accepted, create BUYER_SUPPLIER relationship
    ELSIF _accepted_role = 'SUPPLIER' THEN
      -- Determine the buyer based on material_responsibility setting
      -- First check if there's a material_responsibility stored in project scope or parties
      _material_resp := _project.scope->>'material_responsibility';
      
      -- Default to TC if not specified
      IF _material_resp IS NULL OR _material_resp = '' THEN
        _material_resp := 'TC';
      END IF;
      
      -- Find the buyer participant
      IF _material_resp = 'GC' THEN
        _buyer_participant_id := _gc_participant.id;
      ELSE
        -- Find TC participant
        SELECT id INTO _buyer_participant_id
        FROM project_participants 
        WHERE project_id = NEW.project_id 
          AND role = 'TC'
          AND invite_status = 'ACCEPTED'
        LIMIT 1;
        
        -- If no TC found, fall back to GC
        IF _buyer_participant_id IS NULL THEN
          _buyer_participant_id := _gc_participant.id;
        END IF;
      END IF;
      
      -- Create BUYER_SUPPLIER relationship
      IF _buyer_participant_id IS NOT NULL THEN
        INSERT INTO project_relationships (
          project_id,
          upstream_participant_id,
          downstream_participant_id,
          relationship_type,
          material_responsibility,
          po_requires_upstream_approval
        ) VALUES (
          NEW.project_id,
          _buyer_participant_id,
          NEW.id,
          'BUYER_SUPPLIER',
          _material_resp,
          COALESCE((NEW.id IS NOT NULL), false) -- Will be set by invite params
        )
        ON CONFLICT (project_id, upstream_participant_id, downstream_participant_id) DO NOTHING;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add material_responsibility column to project_participants to store it per-supplier
ALTER TABLE public.project_participants 
ADD COLUMN IF NOT EXISTS material_responsibility text CHECK (material_responsibility IN ('GC', 'TC', NULL));

-- Add po_requires_approval column to project_participants for suppliers
ALTER TABLE public.project_participants 
ADD COLUMN IF NOT EXISTS po_requires_approval boolean DEFAULT false;

-- Update the invite_org_to_project function to accept material settings
CREATE OR REPLACE FUNCTION public.invite_org_to_project(
  _project_id uuid, 
  _org_code text, 
  _role text,
  _material_responsibility text DEFAULT NULL,
  _po_requires_approval boolean DEFAULT false
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
  
  -- Insert participant with material settings
  INSERT INTO project_participants (
    project_id, 
    organization_id, 
    role, 
    invited_by, 
    invite_status,
    material_responsibility,
    po_requires_approval
  )
  VALUES (
    _project_id, 
    _org.id, 
    _role::org_type, 
    _user_id, 
    'INVITED',
    _material_responsibility,
    _po_requires_approval
  )
  RETURNING id INTO _participant_id;
  
  RETURN _participant_id;
END;
$$;

-- Update the relationship creation to use participant settings
CREATE OR REPLACE FUNCTION public.create_relationship_on_accept()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _project projects;
  _gc_participant project_participants;
  _tc_participant project_participants;
  _accepted_role org_type;
  _material_resp text;
  _buyer_participant_id uuid;
  _po_approval boolean;
BEGIN
  -- Only trigger when status changes to ACCEPTED
  IF NEW.invite_status = 'ACCEPTED' AND (OLD.invite_status IS NULL OR OLD.invite_status != 'ACCEPTED') THEN
    -- Get the project
    SELECT * INTO _project FROM projects WHERE id = NEW.project_id;
    
    -- Get the role from participant or org type
    _accepted_role := NEW.role;
    IF _accepted_role IS NULL THEN
      SELECT o.type INTO _accepted_role FROM organizations o WHERE o.id = NEW.organization_id;
    END IF;
    
    -- Get GC participant
    SELECT * INTO _gc_participant 
    FROM project_participants 
    WHERE project_id = NEW.project_id 
      AND role = 'GC'
      AND invite_status = 'ACCEPTED'
    LIMIT 1;
    
    -- If no GC found, check project owner
    IF _gc_participant.id IS NULL THEN
      SELECT * INTO _gc_participant 
      FROM project_participants 
      WHERE project_id = NEW.project_id 
        AND organization_id = _project.organization_id
      LIMIT 1;
    END IF;
    
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
        COALESCE(NEW.material_responsibility, 'TC'),
        false
      )
      ON CONFLICT (project_id, upstream_participant_id, downstream_participant_id) DO NOTHING;
    
    -- If an FC accepted, create TC->FC relationship
    ELSIF _accepted_role = 'FC' THEN
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
    
    -- If a SUPPLIER accepted, create BUYER_SUPPLIER relationship
    ELSIF _accepted_role = 'SUPPLIER' THEN
      -- Use material_responsibility from participant (set during invite)
      _material_resp := COALESCE(NEW.material_responsibility, 'TC');
      _po_approval := COALESCE(NEW.po_requires_approval, false);
      
      -- Find the buyer participant based on material_responsibility
      IF _material_resp = 'GC' THEN
        _buyer_participant_id := _gc_participant.id;
      ELSE
        -- Find TC participant
        SELECT id INTO _buyer_participant_id
        FROM project_participants 
        WHERE project_id = NEW.project_id 
          AND role = 'TC'
          AND invite_status = 'ACCEPTED'
        LIMIT 1;
        
        -- If no TC found, fall back to GC
        IF _buyer_participant_id IS NULL THEN
          _buyer_participant_id := _gc_participant.id;
        END IF;
      END IF;
      
      -- Create BUYER_SUPPLIER relationship
      IF _buyer_participant_id IS NOT NULL THEN
        INSERT INTO project_relationships (
          project_id,
          upstream_participant_id,
          downstream_participant_id,
          relationship_type,
          material_responsibility,
          po_requires_upstream_approval
        ) VALUES (
          NEW.project_id,
          _buyer_participant_id,
          NEW.id,
          'BUYER_SUPPLIER',
          _material_resp,
          _po_approval
        )
        ON CONFLICT (project_id, upstream_participant_id, downstream_participant_id) DO NOTHING;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;