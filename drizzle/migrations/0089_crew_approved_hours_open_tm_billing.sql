CREATE OR REPLACE FUNCTION public.list_billable_change_orders(p_project_id uuid, p_from_org_id uuid)
RETURNS TABLE(co_id uuid, co_number text, title text, description text, contract_id uuid, contract_sum numeric, from_org_name text, to_org_id uuid, to_org_name text, to_role text, grand_total numeric, already_billed numeric, remaining numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_org_type public.org_type;
BEGIN
  IF NOT public.can_see_project(p_project_id) THEN RAISE EXCEPTION 'Not authorized' USING errcode = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_org_roles WHERE user_id = auth.uid() AND organization_id = p_from_org_id) THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;
  SELECT o.type INTO v_org_type FROM public.organizations o WHERE o.id = p_from_org_id;
  RETURN QUERY
  WITH cos AS (
    SELECT co.id, co.co_number, co.title, co.reason_note AS description,
      CASE WHEN v_org_type = 'FC' THEN
        COALESCE((SELECT SUM(le.line_total) FROM public.co_labor_entries le
          JOIN public.co_line_items li ON li.id = le.co_line_item_id
          WHERE le.co_id = co.id AND le.org_id = p_from_org_id
            AND le.entered_by_role = 'FC'
            AND COALESCE(le.is_actual_cost, false) = false
            AND (
              li.approval_status = 'approved'
              OR (co.pricing_type = 'tm' AND co.status = 'submitted' AND le.crew_review_status = 'approved')
            )
            AND (
              co.pricing_type <> 'tm'
              OR le.crew_review_status = 'approved'
              OR (le.crew_review_status IS NULL AND co.status IN ('approved','contracted'))
            )), 0)
      ELSE public.co_grand_total(co.id) END AS grand_total,
      CASE WHEN v_org_type = 'FC' THEN
        COALESCE(
          (SELECT pc.id FROM public.project_contracts pc WHERE pc.project_id = co.project_id AND pc.from_org_id = p_from_org_id
             AND pc.to_org_id IN (co.assigned_to_org_id, co.org_id) ORDER BY pc.created_at LIMIT 1),
          (SELECT pc.id FROM public.project_contracts pc WHERE pc.project_id = co.project_id AND pc.from_org_id = p_from_org_id
             ORDER BY pc.created_at LIMIT 1))
      ELSE public._co_target_contract_id(co.project_id, co.org_id, co.assigned_to_org_id) END AS contract_id
    FROM public.change_orders co
    WHERE co.project_id = p_project_id
      AND (co.org_id = p_from_org_id OR co.assigned_to_org_id = p_from_org_id OR co.originating_org_id = p_from_org_id
        OR EXISTS (SELECT 1 FROM public.change_order_collaborators cc WHERE cc.co_id = co.id AND cc.organization_id = p_from_org_id))
      AND (
        (co.status IN ('approved','contracted') AND co.approved_at IS NOT NULL)
        OR (v_org_type = 'FC' AND co.pricing_type = 'tm' AND co.status = 'submitted'
          AND EXISTS (
            SELECT 1 FROM public.co_labor_entries approved_le
            WHERE approved_le.co_id = co.id AND approved_le.org_id = p_from_org_id
              AND approved_le.entered_by_role = 'FC'
              AND COALESCE(approved_le.is_actual_cost, false) = false
              AND approved_le.crew_review_status = 'approved'
          ))
      )
  ),
  billed AS (
    SELECT b.co_id, COALESCE(SUM(b.amount), 0) AS amount FROM (
      SELECT ili.source_co_id AS co_id, ili.current_billed AS amount
      FROM public.invoice_line_items ili
      JOIN public.invoices inv ON inv.id = ili.invoice_id
      JOIN public.project_contracts ic ON ic.id = inv.contract_id
      WHERE ili.source_co_id IS NOT NULL AND inv.project_id = p_project_id
        AND inv.status IN ('SUBMITTED','APPROVED','PAID') AND ic.from_org_id = p_from_org_id
      UNION ALL
      SELECT co_id_unnest::uuid,
        COALESCE((SELECT SUM(ili.current_billed) FROM public.invoice_line_items ili
                  WHERE ili.invoice_id = inv.id AND ili.source_co_id IS NULL), 0)
          / GREATEST(array_length(inv.co_ids, 1), 1)
      FROM public.invoices inv
      JOIN public.project_contracts ic ON ic.id = inv.contract_id
      CROSS JOIN LATERAL unnest(COALESCE(inv.co_ids, ARRAY[]::text[])) AS co_id_unnest
      WHERE inv.project_id = p_project_id AND inv.status IN ('SUBMITTED','APPROVED','PAID') AND ic.from_org_id = p_from_org_id
    ) b GROUP BY b.co_id
  )
  SELECT cos.id, cos.co_number, cos.title, cos.description, cos.contract_id,
    COALESCE(pc.contract_sum, 0)::numeric, fo.name, pc.to_org_id, o.name, pc.to_role,
    COALESCE(cos.grand_total, 0)::numeric, COALESCE(billed.amount, 0)::numeric,
    GREATEST(COALESCE(cos.grand_total, 0) - COALESCE(billed.amount, 0), 0)::numeric
  FROM cos
  LEFT JOIN public.project_contracts pc ON pc.id = cos.contract_id
  LEFT JOIN public.organizations o ON o.id = pc.to_org_id
  LEFT JOIN public.organizations fo ON fo.id = pc.from_org_id
  LEFT JOIN billed ON billed.co_id = cos.id
  WHERE cos.contract_id IS NOT NULL AND COALESCE(cos.grand_total, 0) > 0
  ORDER BY cos.co_number NULLS LAST;
END;
$function$;