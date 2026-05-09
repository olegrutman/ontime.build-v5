INSERT INTO public.change_order_collaborators
  (co_id, organization_id, collaborator_type, status, invited_by_user_id)
SELECT
  co.id,
  fc.organization_id,
  'FC',
  'active',
  co.created_by_user_id
FROM public.change_orders co
JOIN LATERAL (
  SELECT pp.organization_id
  FROM public.project_participants pp
  WHERE pp.project_id = co.project_id
    AND pp.role = 'FC'
    AND pp.invite_status = 'ACCEPTED'
) fc ON TRUE
WHERE co.fc_input_needed = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.change_order_collaborators c
    WHERE c.co_id = co.id AND c.collaborator_type = 'FC'
  )
  AND (
    SELECT COUNT(*) FROM public.project_participants pp2
    WHERE pp2.project_id = co.project_id
      AND pp2.role = 'FC'
      AND pp2.invite_status = 'ACCEPTED'
  ) = 1;

UPDATE public.change_orders co
SET fc_input_needed = FALSE
WHERE co.fc_input_needed = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.project_participants pp
    WHERE pp.project_id = co.project_id
      AND pp.role = 'FC'
      AND pp.invite_status = 'ACCEPTED'
  );