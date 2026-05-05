
-- Fix swapped argument order in is_project_participant() calls across RLS policies.
-- The function signature is is_project_participant(_user_id, _project_id),
-- but several policies had the arguments reversed.

-- ============ co_photos ============
DROP POLICY IF EXISTS "Participants can view CO photos" ON public.co_photos;
CREATE POLICY "Participants can view CO photos" ON public.co_photos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM change_orders co
    WHERE co.id = co_photos.co_id
      AND is_project_participant(auth.uid(), co.project_id)
  )
);

DROP POLICY IF EXISTS "Participants can insert CO photos" ON public.co_photos;
CREATE POLICY "Participants can insert CO photos" ON public.co_photos
FOR INSERT WITH CHECK (
  uploaded_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM change_orders co
    WHERE co.id = co_photos.co_id
      AND is_project_participant(auth.uid(), co.project_id)
  )
);

-- ============ co_evidence ============
DROP POLICY IF EXISTS "Participants can view CO evidence" ON public.co_evidence;
CREATE POLICY "Participants can view CO evidence" ON public.co_evidence
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM change_orders co
    WHERE co.id = co_evidence.co_id
      AND is_project_participant(auth.uid(), co.project_id)
  )
);

DROP POLICY IF EXISTS "Participants can insert CO evidence" ON public.co_evidence;
CREATE POLICY "Participants can insert CO evidence" ON public.co_evidence
FOR INSERT WITH CHECK (
  uploaded_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM change_orders co
    WHERE co.id = co_evidence.co_id
      AND is_project_participant(auth.uid(), co.project_id)
  )
);

-- ============ backcharges ============
DROP POLICY IF EXISTS "Project participants can view backcharges" ON public.backcharges;
CREATE POLICY "Project participants can view backcharges" ON public.backcharges
FOR SELECT USING (is_project_participant(auth.uid(), project_id));

DROP POLICY IF EXISTS "Authenticated users can create backcharges on their projects" ON public.backcharges;
CREATE POLICY "Authenticated users can create backcharges on their projects" ON public.backcharges
FOR INSERT WITH CHECK (
  auth.uid() = created_by_user_id
  AND is_project_participant(auth.uid(), project_id)
);

DROP POLICY IF EXISTS "Project participants can update backcharges" ON public.backcharges;
CREATE POLICY "Project participants can update backcharges" ON public.backcharges
FOR UPDATE USING (is_project_participant(auth.uid(), project_id));

-- ============ rfis ============
DROP POLICY IF EXISTS "Project participants can view rfis" ON public.rfis;
CREATE POLICY "Project participants can view rfis" ON public.rfis
FOR SELECT USING (is_project_participant(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project participants can create rfis" ON public.rfis;
CREATE POLICY "Project participants can create rfis" ON public.rfis
FOR INSERT WITH CHECK (is_project_participant(auth.uid(), project_id));

DROP POLICY IF EXISTS "Submitter or recipient org can update rfis" ON public.rfis;
CREATE POLICY "Submitter or recipient org can update rfis" ON public.rfis
FOR UPDATE USING (is_project_participant(auth.uid(), project_id));

-- ============ rfi_attachments ============
DROP POLICY IF EXISTS "RFI participants can view attachments" ON public.rfi_attachments;
CREATE POLICY "RFI participants can view attachments" ON public.rfi_attachments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM rfis r
    WHERE r.id = rfi_attachments.rfi_id
      AND is_project_participant(auth.uid(), r.project_id)
  )
);

DROP POLICY IF EXISTS "Authenticated users can add attachments" ON public.rfi_attachments;
CREATE POLICY "Authenticated users can add attachments" ON public.rfi_attachments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM rfis r
    WHERE r.id = rfi_attachments.rfi_id
      AND is_project_participant(auth.uid(), r.project_id)
  )
);

-- ============ co_external_invites ============
DROP POLICY IF EXISTS "Project participants can view co_external_invites" ON public.co_external_invites;
CREATE POLICY "Project participants can view co_external_invites" ON public.co_external_invites
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM change_orders co
    WHERE co.id = co_external_invites.co_id
      AND is_project_participant(auth.uid(), co.project_id)
  )
);

DROP POLICY IF EXISTS "Project participants can create co_external_invites" ON public.co_external_invites;
CREATE POLICY "Project participants can create co_external_invites" ON public.co_external_invites
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM change_orders co
    WHERE co.id = co_external_invites.co_id
      AND is_project_participant(auth.uid(), co.project_id)
  )
);
