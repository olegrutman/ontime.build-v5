-- Fix create_relationship_on_accept trigger to handle cases where creator participant may not exist yet
-- and to safely skip relationship creation if upstream/downstream IDs are null

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
    
    -- Get creator's org type
    SELECT o.type INTO _creator_org_type
    FROM organizations o
    WHERE o.id = _project.organization_id;
    
    -- Get creator's participant record (may not exist if creator didn't add themselves)
    SELECT * INTO _creator_participant
    FROM project_participants
    WHERE project_id = NEW.project_id 
      AND organization_id = _project.organization_id
    LIMIT 1;
    
    -- Get GC participant (if exists and accepted, or is the accepting one)
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
        -- Creator participant might not exist yet; use TC participant if available
        IF _creator_participant.id IS NULL THEN
          -- Try to find TC participant for this project's creator org
          SELECT * INTO _creator_participant
          FROM project_participants
          WHERE project_id = NEW.project_id 
            AND role = 'TC'
          LIMIT 1;
        END IF;
        
        -- Only insert if we have a valid downstream (TC) id
        IF _creator_participant.id IS NOT NULL THEN
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
        ELSIF _creator_org_type = 'GC' AND _creator_participant.id IS NOT NULL THEN
          _buyer_participant_id := _creator_participant.id;
        END IF;
      ELSE
        IF _tc_participant.id IS NOT NULL THEN
          _buyer_participant_id := _tc_participant.id;
        ELSIF _creator_org_type = 'TC' AND _creator_participant.id IS NOT NULL THEN
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