-- Create a new RPC that accepts org_id directly for inviting to projects
CREATE OR REPLACE FUNCTION public.invite_org_to_project_by_id(
  _project_id uuid, 
  _org_id uuid, 
  _role text,
  _material_responsibility text DEFAULT NULL,
  _po_requires_approval boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id uuid := auth.uid();
  _participant_id uuid;
BEGIN
  -- Validate role
  IF _role NOT IN ('GC', 'TC', 'FC', 'SUPPLIER') THEN
    RAISE EXCEPTION 'Invalid role: %', _role;
  END IF;
  
  -- Check org exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = _org_id) THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  -- Check if already a participant
  IF EXISTS (SELECT 1 FROM project_participants WHERE project_id = _project_id AND organization_id = _org_id) THEN
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
    _org_id, 
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

-- Update the trigger to handle GC->TC and TC->FC linking properly
CREATE OR REPLACE FUNCTION public.create_relationship_on_accept()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _project projects;
  _gc_participant project_participants;
  _tc_participant project_participants;
  _creator_participant project_participants;
  _accepted_role org_type;
  _creator_org_type org_type;
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
    
    -- Get creator's participant record
    SELECT * INTO _creator_participant
    FROM project_participants
    WHERE project_id = NEW.project_id 
      AND organization_id = _project.organization_id
    LIMIT 1;
    
    -- Get creator's org type separately
    SELECT o.type INTO _creator_org_type
    FROM organizations o
    WHERE o.id = _project.organization_id;
    
    -- Get GC participant (if exists and accepted)
    SELECT * INTO _gc_participant 
    FROM project_participants 
    WHERE project_id = NEW.project_id 
      AND role = 'GC'
      AND invite_status = 'ACCEPTED'
    LIMIT 1;
    
    -- Get TC participant (if exists and accepted)
    SELECT * INTO _tc_participant 
    FROM project_participants 
    WHERE project_id = NEW.project_id 
      AND role = 'TC'
      AND invite_status = 'ACCEPTED'
    LIMIT 1;
    
    -- Handle GC acceptance
    IF _accepted_role = 'GC' THEN
      -- If project was created by TC, create GC(upstream)->TC(downstream) relationship
      IF _creator_org_type = 'TC' THEN
        INSERT INTO project_relationships (
          project_id,
          upstream_participant_id,
          downstream_participant_id,
          relationship_type,
          material_responsibility,
          po_requires_upstream_approval
        ) VALUES (
          NEW.project_id,
          NEW.id,
          _creator_participant.id,
          'GC_TC',
          COALESCE(_creator_participant.material_responsibility, 'TC'),
          false
        )
        ON CONFLICT (project_id, upstream_participant_id, downstream_participant_id) DO NOTHING;
      END IF;
    
    -- Handle TC acceptance
    ELSIF _accepted_role = 'TC' THEN
      -- Find GC participant to link to
      IF _gc_participant.id IS NULL THEN
        -- Use creator if they're GC
        IF _creator_org_type = 'GC' THEN
          _gc_participant := _creator_participant;
        END IF;
      END IF;
      
      IF _gc_participant.id IS NOT NULL THEN
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
      END IF;
    
    -- Handle FC acceptance
    ELSIF _accepted_role = 'FC' THEN
      -- Find TC to link to (could be creator or accepted participant)
      IF _tc_participant.id IS NULL AND _creator_org_type = 'TC' THEN
        _tc_participant := _creator_participant;
      END IF;
      
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
    
    -- Handle SUPPLIER acceptance
    ELSIF _accepted_role = 'SUPPLIER' THEN
      _material_resp := COALESCE(NEW.material_responsibility, 'TC');
      _po_approval := COALESCE(NEW.po_requires_approval, false);
      
      -- Find the buyer based on material_responsibility
      IF _material_resp = 'GC' THEN
        IF _gc_participant.id IS NOT NULL THEN
          _buyer_participant_id := _gc_participant.id;
        ELSIF _creator_org_type = 'GC' THEN
          _buyer_participant_id := _creator_participant.id;
        END IF;
      ELSE
        -- TC is buyer
        IF _tc_participant.id IS NOT NULL THEN
          _buyer_participant_id := _tc_participant.id;
        ELSIF _creator_org_type = 'TC' THEN
          _buyer_participant_id := _creator_participant.id;
        ELSIF _gc_participant.id IS NOT NULL THEN
          _buyer_participant_id := _gc_participant.id;
        ELSIF _creator_org_type = 'GC' THEN
          _buyer_participant_id := _creator_participant.id;
        END IF;
      END IF;
      
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