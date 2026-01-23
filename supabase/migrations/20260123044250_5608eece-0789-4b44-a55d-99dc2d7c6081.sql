
-- Fix: Replace overly permissive INSERT policy with restricted one
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Only allow inserts from security definer functions (triggers) - no direct user inserts
-- This is enforced by NOT having a user INSERT policy; triggers use SECURITY DEFINER

-- =====================================================
-- NOTIFICATION TRIGGERS
-- =====================================================

-- 1. PROJECT INVITE NOTIFICATION
-- Triggered when a row is inserted into project_participants
CREATE OR REPLACE FUNCTION public.notify_project_invite()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _project projects;
  _inviter_org organizations;
BEGIN
  -- Get project details
  SELECT * INTO _project FROM projects WHERE id = NEW.project_id;
  
  -- Get inviter's org name
  SELECT * INTO _inviter_org FROM organizations WHERE id = _project.organization_id;
  
  -- Create notification for invited org
  INSERT INTO notifications (
    recipient_org_id,
    type,
    title,
    body,
    entity_type,
    entity_id,
    action_url
  ) VALUES (
    NEW.organization_id,
    'PROJECT_INVITE',
    'Project Invitation: ' || _project.name,
    _inviter_org.name || ' has invited your organization to join project "' || _project.name || '"',
    'PROJECT',
    NEW.project_id,
    '/project/' || NEW.project_id
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_project_invite
AFTER INSERT ON public.project_participants
FOR EACH ROW
EXECUTE FUNCTION public.notify_project_invite();

-- 2. WORK ITEM INVITE NOTIFICATION  
-- Triggered when a row is inserted into work_item_participants
CREATE OR REPLACE FUNCTION public.notify_work_item_invite()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _work_item work_items;
  _owner_org organizations;
BEGIN
  -- Get work item details
  SELECT * INTO _work_item FROM work_items WHERE id = NEW.work_item_id;
  
  -- Get owner org name
  SELECT * INTO _owner_org FROM organizations WHERE id = _work_item.organization_id;
  
  -- Create notification for invited org
  INSERT INTO notifications (
    recipient_org_id,
    type,
    title,
    body,
    entity_type,
    entity_id,
    action_url
  ) VALUES (
    NEW.organization_id,
    'WORK_ITEM_INVITE',
    'Work Item Assigned: ' || _work_item.title,
    _owner_org.name || ' has assigned your organization to work item "' || _work_item.title || '"',
    'WORK_ITEM',
    NEW.work_item_id,
    '/work-item/' || NEW.work_item_id
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_work_item_invite
AFTER INSERT ON public.work_item_participants
FOR EACH ROW
EXECUTE FUNCTION public.notify_work_item_invite();

-- 3. PO SENT NOTIFICATION
-- Triggered when PO status changes to SENT
CREATE OR REPLACE FUNCTION public.notify_po_sent()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _supplier suppliers;
BEGIN
  -- Only trigger when status changes to SENT
  IF NEW.status = 'SENT' AND (OLD.status IS NULL OR OLD.status != 'SENT') THEN
    -- Get supplier details
    SELECT * INTO _supplier FROM suppliers WHERE id = NEW.supplier_id;
    
    -- Notify supplier's org
    INSERT INTO notifications (
      recipient_org_id,
      type,
      title,
      body,
      entity_type,
      entity_id,
      action_url
    ) VALUES (
      _supplier.organization_id,
      'PO_SENT',
      'New Purchase Order: ' || NEW.po_number,
      'You have received a new purchase order "' || NEW.po_name || '"',
      'PO',
      NEW.id,
      '/purchase-orders'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_po_sent
AFTER UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_po_sent();

-- 4. CHANGE WORK SUBMITTED (PRICED) NOTIFICATION
-- Triggered when work_item state changes from OPEN to PRICED
CREATE OR REPLACE FUNCTION public.notify_change_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tc_org organizations;
BEGIN
  -- Only for CHANGE_WORK items when state changes to PRICED
  IF NEW.item_type = 'CHANGE_WORK' 
     AND NEW.state = 'PRICED' 
     AND (OLD.state IS NULL OR OLD.state = 'OPEN') THEN
    
    -- Get TC org name (the work item's owner org)
    SELECT * INTO _tc_org FROM organizations WHERE id = NEW.organization_id;
    
    -- Find the GC org (project owner) and notify them
    IF NEW.project_id IS NOT NULL THEN
      INSERT INTO notifications (
        recipient_org_id,
        type,
        title,
        body,
        entity_type,
        entity_id,
        action_url
      )
      SELECT 
        p.organization_id,
        'CHANGE_SUBMITTED',
        'Change Work Submitted: ' || COALESCE(NEW.code, NEW.title),
        _tc_org.name || ' has submitted change work "' || NEW.title || '" for approval',
        'WORK_ITEM',
        NEW.id,
        '/work-item/' || NEW.id
      FROM projects p
      WHERE p.id = NEW.project_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_change_submitted
AFTER UPDATE ON public.work_items
FOR EACH ROW
EXECUTE FUNCTION public.notify_change_submitted();

-- 5. CHANGE WORK APPROVED/REJECTED NOTIFICATION
-- Triggered when work_item state changes from PRICED to APPROVED or back to OPEN (rejected)
CREATE OR REPLACE FUNCTION public.notify_change_approved_rejected()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _gc_org organizations;
  _notif_type notification_type;
  _notif_title text;
  _notif_body text;
BEGIN
  -- Only for CHANGE_WORK items 
  IF NEW.item_type = 'CHANGE_WORK' AND OLD.state = 'PRICED' THEN
    
    -- Get GC org name (project owner)
    SELECT o.* INTO _gc_org 
    FROM projects p 
    JOIN organizations o ON o.id = p.organization_id 
    WHERE p.id = NEW.project_id;
    
    IF NEW.state = 'APPROVED' THEN
      _notif_type := 'CHANGE_APPROVED';
      _notif_title := 'Change Work Approved: ' || COALESCE(NEW.code, NEW.title);
      _notif_body := _gc_org.name || ' has approved change work "' || NEW.title || '"';
    ELSIF NEW.state = 'OPEN' AND NEW.rejection_notes IS NOT NULL THEN
      _notif_type := 'CHANGE_REJECTED';
      _notif_title := 'Change Work Rejected: ' || COALESCE(NEW.code, NEW.title);
      _notif_body := _gc_org.name || ' has rejected change work "' || NEW.title || '": ' || NEW.rejection_notes;
    ELSE
      RETURN NEW; -- No notification needed
    END IF;
    
    -- Notify the TC org (work item owner)
    INSERT INTO notifications (
      recipient_org_id,
      type,
      title,
      body,
      entity_type,
      entity_id,
      action_url
    ) VALUES (
      NEW.organization_id,
      _notif_type,
      _notif_title,
      _notif_body,
      'WORK_ITEM',
      NEW.id,
      '/work-item/' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_change_approved_rejected
AFTER UPDATE ON public.work_items
FOR EACH ROW
EXECUTE FUNCTION public.notify_change_approved_rejected();
