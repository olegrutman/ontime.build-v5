DROP FUNCTION IF EXISTS public.list_billable_change_orders(uuid, uuid);

CREATE FUNCTION public.list_billable_change_orders(p_project_id uuid, p_from_org_id uuid)
RETURNS TABLE (
  co_id uuid,
  co_number text,
  title text,
  description text,
  contract_id uuid,
  contract_sum numeric,
  from_org_name text,
  to_org_id uuid,
  to_org_name text,
  to_role text,
  grand_total numeric,
  already_billed numeric,
  remaining numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cos AS (
    SELECT
      co.id,
      co.co_number,
      co.title,
      co.reason_note AS description,
      co.org_id,
      co.assigned_to_org_id,
      public._co_target_contract_id(co.project_id, co.org_id, co.assigned_to_org_id) AS contract_id,
      public.co_grand_total(co.id) AS grand_total
    FROM public.change_orders co
    WHERE co.project_id = p_project_id
      AND co.org_id = p_from_org_id
      AND co.status = 'approved'
      AND co.approved_at IS NOT NULL
  ),
  billed AS (
    SELECT
      co_id_unnest::uuid AS co_id,
      COALESCE(SUM(ili.current_billed), 0) AS amount
    FROM public.invoices inv
    CROSS JOIN LATERAL unnest(COALESCE(inv.co_ids, ARRAY[]::text[])) AS co_id_unnest
    LEFT JOIN public.invoice_line_items ili ON ili.invoice_id = inv.id
    WHERE inv.project_id = p_project_id
      AND inv.status IN ('SUBMITTED','APPROVED','PAID')
    GROUP BY co_id_unnest
  )
  SELECT
    cos.id,
    cos.co_number,
    cos.title,
    cos.description,
    cos.contract_id,
    COALESCE(pc.contract_sum, 0)::numeric,
    fo.name AS from_org_name,
    pc.to_org_id,
    o.name AS to_org_name,
    pc.to_role,
    COALESCE(cos.grand_total, 0)::numeric,
    COALESCE(billed.amount, 0)::numeric,
    GREATEST(COALESCE(cos.grand_total, 0) - COALESCE(billed.amount, 0), 0)::numeric
  FROM cos
  LEFT JOIN public.project_contracts pc ON pc.id = cos.contract_id
  LEFT JOIN public.organizations o ON o.id = pc.to_org_id
  LEFT JOIN public.organizations fo ON fo.id = pc.from_org_id
  LEFT JOIN billed ON billed.co_id = cos.id
  WHERE cos.contract_id IS NOT NULL
    AND COALESCE(cos.grand_total, 0) > 0
  ORDER BY cos.co_number NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.list_billable_change_orders(uuid, uuid) TO authenticated;