
-- =====================================================
-- V1 NOTIFICATIONS SYSTEM
-- =====================================================

-- 1. NOTIFICATION TYPE ENUM
CREATE TYPE public.notification_type AS ENUM (
  'PROJECT_INVITE',
  'WORK_ITEM_INVITE', 
  'PO_SENT',
  'CHANGE_SUBMITTED',
  'CHANGE_APPROVED',
  'CHANGE_REJECTED'
);

-- 2. NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_user_id uuid NULL, -- NULL means all users in org
  type public.notification_type NOT NULL,
  title text NOT NULL,
  body text NULL,
  entity_type text NOT NULL, -- PROJECT, WORK_ITEM, PO
  entity_id uuid NOT NULL,
  action_url text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_notifications_recipient_org ON public.notifications(recipient_org_id);
CREATE INDEX idx_notifications_recipient_user ON public.notifications(recipient_user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(recipient_org_id, is_read) WHERE is_read = false;

-- 3. NOTIFICATION READS TABLE (per-user read tracking for org-level notifications)
CREATE TABLE public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

CREATE INDEX idx_notification_reads_user ON public.notification_reads(user_id);

-- 4. PROJECT PARTICIPANTS TABLE (for project-level invites with acceptance flow)
CREATE TABLE public.project_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_at timestamptz NOT NULL DEFAULT now(),
  invited_by uuid NOT NULL,
  invite_status text NOT NULL DEFAULT 'INVITED' CHECK (invite_status IN ('INVITED', 'ACCEPTED', 'DECLINED')),
  accepted_at timestamptz NULL,
  UNIQUE(project_id, organization_id)
);

CREATE INDEX idx_project_participants_org ON public.project_participants(organization_id);
CREATE INDEX idx_project_participants_project ON public.project_participants(project_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_participants ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has read an org-level notification
CREATE OR REPLACE FUNCTION public.user_has_read_notification(_user_id uuid, _notification_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM notification_reads
    WHERE notification_id = _notification_id AND user_id = _user_id
  )
$$;

-- NOTIFICATIONS RLS
-- Users can see notifications where they are the recipient OR their org is the recipient
CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT USING (
  recipient_user_id = auth.uid()
  OR (recipient_user_id IS NULL AND user_in_org(auth.uid(), recipient_org_id))
);

-- Users can update is_read only on notifications they can view
CREATE POLICY "Users can mark their notifications read"
ON public.notifications FOR UPDATE USING (
  recipient_user_id = auth.uid()
  OR (recipient_user_id IS NULL AND user_in_org(auth.uid(), recipient_org_id))
);

-- System creates notifications (via triggers/functions)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT WITH CHECK (true);

-- NOTIFICATION_READS RLS
CREATE POLICY "Users can view own reads"
ON public.notification_reads FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reads"
ON public.notification_reads FOR INSERT WITH CHECK (user_id = auth.uid());

-- PROJECT_PARTICIPANTS RLS
-- Owner org (GC) can manage participants
CREATE POLICY "GC_PM can manage project participants"
ON public.project_participants FOR ALL USING (
  is_gc_pm(auth.uid()) AND EXISTS (
    SELECT 1 FROM projects p WHERE p.id = project_participants.project_id 
    AND user_in_org(auth.uid(), p.organization_id)
  )
) WITH CHECK (
  is_gc_pm(auth.uid()) AND EXISTS (
    SELECT 1 FROM projects p WHERE p.id = project_participants.project_id 
    AND user_in_org(auth.uid(), p.organization_id)
  )
);

-- Invited org members can view and update (accept/decline) their invites
CREATE POLICY "Invited org can view their participation"
ON public.project_participants FOR SELECT USING (
  user_in_org(auth.uid(), organization_id)
);

CREATE POLICY "Invited org PM can accept/decline"
ON public.project_participants FOR UPDATE USING (
  is_pm_role(auth.uid()) AND user_in_org(auth.uid(), organization_id)
);

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

-- Get user's notifications (handles both user-specific and org-level)
CREATE OR REPLACE FUNCTION public.get_my_notifications(_limit int DEFAULT 50, _offset int DEFAULT 0)
RETURNS TABLE (
  id uuid,
  type notification_type,
  title text,
  body text,
  entity_type text,
  entity_id uuid,
  action_url text,
  is_read boolean,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id uuid := auth.uid();
  _user_org_id uuid;
BEGIN
  -- Get user's org
  SELECT organization_id INTO _user_org_id FROM user_org_roles WHERE user_id = _user_id LIMIT 1;
  
  RETURN QUERY
  SELECT 
    n.id,
    n.type,
    n.title,
    n.body,
    n.entity_type,
    n.entity_id,
    n.action_url,
    -- For user-specific notifications, use is_read directly
    -- For org-level notifications, check notification_reads table
    CASE 
      WHEN n.recipient_user_id IS NOT NULL THEN n.is_read
      ELSE COALESCE(user_has_read_notification(_user_id, n.id), false)
    END as is_read,
    n.created_at
  FROM notifications n
  WHERE 
    n.recipient_user_id = _user_id
    OR (n.recipient_user_id IS NULL AND n.recipient_org_id = _user_org_id)
  ORDER BY n.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

-- Get unread count
CREATE OR REPLACE FUNCTION public.get_unread_count()
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id uuid := auth.uid();
  _user_org_id uuid;
  _count integer;
BEGIN
  SELECT organization_id INTO _user_org_id FROM user_org_roles WHERE user_id = _user_id LIMIT 1;
  
  SELECT COUNT(*)::integer INTO _count
  FROM notifications n
  WHERE (
    -- User-specific unread
    (n.recipient_user_id = _user_id AND n.is_read = false)
    -- Org-level not read by this user
    OR (n.recipient_user_id IS NULL 
        AND n.recipient_org_id = _user_org_id 
        AND NOT EXISTS (
          SELECT 1 FROM notification_reads nr 
          WHERE nr.notification_id = n.id AND nr.user_id = _user_id
        ))
  );
  
  RETURN _count;
END;
$$;

-- Mark single notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(_notification_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id uuid := auth.uid();
  _notif notifications;
BEGIN
  SELECT * INTO _notif FROM notifications WHERE id = _notification_id;
  
  IF _notif IS NULL THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;
  
  -- User-specific notification: update is_read directly
  IF _notif.recipient_user_id = _user_id THEN
    UPDATE notifications SET is_read = true WHERE id = _notification_id;
  -- Org-level notification: insert into reads table
  ELSIF _notif.recipient_user_id IS NULL AND user_in_org(_user_id, _notif.recipient_org_id) THEN
    INSERT INTO notification_reads (notification_id, user_id)
    VALUES (_notification_id, _user_id)
    ON CONFLICT (notification_id, user_id) DO NOTHING;
  ELSE
    RAISE EXCEPTION 'Access denied';
  END IF;
END;
$$;

-- Mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id uuid := auth.uid();
  _user_org_id uuid;
BEGIN
  SELECT organization_id INTO _user_org_id FROM user_org_roles WHERE user_id = _user_id LIMIT 1;
  
  -- Mark user-specific notifications
  UPDATE notifications SET is_read = true
  WHERE recipient_user_id = _user_id AND is_read = false;
  
  -- Mark org-level notifications (insert reads)
  INSERT INTO notification_reads (notification_id, user_id)
  SELECT n.id, _user_id
  FROM notifications n
  WHERE n.recipient_user_id IS NULL
    AND n.recipient_org_id = _user_org_id
    AND NOT EXISTS (
      SELECT 1 FROM notification_reads nr 
      WHERE nr.notification_id = n.id AND nr.user_id = _user_id
    )
  ON CONFLICT (notification_id, user_id) DO NOTHING;
END;
$$;

-- Accept project invite
CREATE OR REPLACE FUNCTION public.accept_project_invite(_project_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id uuid := auth.uid();
  _user_org_id uuid;
BEGIN
  SELECT organization_id INTO _user_org_id FROM user_org_roles WHERE user_id = _user_id LIMIT 1;
  
  IF NOT is_pm_role(_user_id) THEN
    RAISE EXCEPTION 'Only PM roles can accept invites';
  END IF;
  
  UPDATE project_participants
  SET invite_status = 'ACCEPTED', accepted_at = now()
  WHERE project_id = _project_id 
    AND organization_id = _user_org_id
    AND invite_status = 'INVITED';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending invite found';
  END IF;
END;
$$;

-- Decline project invite
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
