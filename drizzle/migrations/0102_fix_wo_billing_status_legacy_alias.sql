CREATE OR REPLACE FUNCTION public.get_wo_billing_status(
  p_project_id uuid,
  p_org_id uuid,
  p_co_ids uuid[],
  p_direction text DEFAULT 'issued'
)
RETURNS TABLE(co_id uuid, billed numeric, draft numeric, entry_ids uuid[], legacy_fully_billed boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_in_org(auth.uid(), p_org_id) OR NOT public.can_see_project(p_project_id) THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;
  IF p_direction NOT IN ('issued','received') THEN RAISE EXCEPTION 'Invalid billing direction'; END IF;

  RETURN QUERY
  WITH requested AS (
    SELECT DISTINCT unnest(COALESCE(p_co_ids, ARRAY[]::uuid[])) AS co_id
  ), scoped_contracts AS (
    SELECT pc.id FROM public.project_contracts pc
    WHERE pc.project_id = p_project_id
      AND CASE WHEN p_direction = 'issued' THEN pc.from_org_id = p_org_id ELSE pc.to_org_id = p_org_id END
  ), tracked_invoices AS (
    SELECT i.id, i.status, i.co_ids
    FROM public.invoices i
    JOIN scoped_contracts sc ON sc.id = i.contract_id
    WHERE i.project_id = p_project_id
      AND i.status NOT IN ('REJECTED','VOID','VOIDED')
  ), tagged_lines AS (
    SELECT ili.invoice_id, ili.source_co_id, ili.source_entry_ids, ili.current_billed, ili.description, ti.status
    FROM public.invoice_line_items ili
    JOIN tracked_invoices ti ON ti.id = ili.invoice_id
    WHERE ili.source_co_id = ANY(COALESCE(p_co_ids, ARRAY[]::uuid[]))
  ), totals AS (
    SELECT tl.source_co_id AS co_id,
      COALESCE(SUM(CASE WHEN tl.status <> 'DRAFT' AND tl.description !~* '^\s*(sales\s+)?tax(\s|\(|$)' THEN tl.current_billed ELSE 0 END), 0)::numeric AS billed,
      COALESCE(SUM(CASE WHEN tl.status = 'DRAFT' AND tl.description !~* '^\s*(sales\s+)?tax(\s|\(|$)' THEN tl.current_billed ELSE 0 END), 0)::numeric AS draft
    FROM tagged_lines tl GROUP BY tl.source_co_id
  ), entries AS (
    SELECT tl.source_co_id AS co_id, array_agg(DISTINCT e.entry_id) AS entry_ids
    FROM tagged_lines tl
    CROSS JOIN LATERAL unnest(COALESCE(tl.source_entry_ids, ARRAY[]::uuid[])) AS e(entry_id)
    GROUP BY tl.source_co_id
  ), legacy AS (
    SELECT DISTINCT legacy_co.co_id
    FROM tracked_invoices ti
    CROSS JOIN LATERAL unnest(COALESCE(ti.co_ids, ARRAY[]::text[])) AS u(co_id_text)
    JOIN requested legacy_co ON legacy_co.co_id::text = u.co_id_text
    WHERE ti.status <> 'DRAFT'
      AND NOT EXISTS (SELECT 1 FROM tagged_lines tl WHERE tl.invoice_id = ti.id)
  )
  SELECT r.co_id,
    COALESCE(t.billed, 0)::numeric,
    COALESCE(t.draft, 0)::numeric,
    COALESCE(e.entry_ids, ARRAY[]::uuid[]),
    (l.co_id IS NOT NULL)
  FROM requested r
  LEFT JOIN totals t ON t.co_id = r.co_id
  LEFT JOIN entries e ON e.co_id = r.co_id
  LEFT JOIN legacy l ON l.co_id = r.co_id;
END;
$function$;