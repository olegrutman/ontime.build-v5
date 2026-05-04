
DROP POLICY "Assigned org can work active change orders" ON change_orders;

CREATE POLICY "Assigned org can work active change orders"
ON change_orders FOR UPDATE TO authenticated
USING (
  assigned_to_org_id IS NOT NULL
  AND user_in_org(auth.uid(), assigned_to_org_id)
  AND status = ANY (ARRAY[
    'draft', 'shared', 'rejected', 'combined',
    'work_in_progress', 'closed_for_pricing', 'submitted', 'approved'
  ])
)
WITH CHECK (
  assigned_to_org_id IS NOT NULL
  AND user_in_org(auth.uid(), assigned_to_org_id)
  AND status = ANY (ARRAY[
    'draft', 'shared', 'submitted', 'rejected', 'combined',
    'work_in_progress', 'closed_for_pricing', 'approved'
  ])
);
