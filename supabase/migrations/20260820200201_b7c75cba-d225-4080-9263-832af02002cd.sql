UPDATE public.change_orders
SET owner_approval_token = NULL,
    owner_approval_status = 'not_required',
    owner_approver_name = NULL,
    owner_approved_at = NULL,
    owner_rejection_note = NULL
WHERE id = '4193e1e7-9ba0-4ae4-92c5-d4d22dfae6d0';

DELETE FROM public.co_activity
WHERE co_id = '4193e1e7-9ba0-4ae4-92c5-d4d22dfae6d0'
  AND actor_role = 'EXTERNAL'
  AND detail LIKE '%Test Owner%';