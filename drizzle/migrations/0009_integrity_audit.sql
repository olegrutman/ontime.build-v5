CREATE TABLE public.integrity_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  trigger_source text NOT NULL DEFAULT 'manual',
  checks_run integer NOT NULL DEFAULT 0,
  checks_failed integer NOT NULL DEFAULT 0,
  findings_count integer NOT NULL DEFAULT 0
);
CREATE TABLE public.integrity_audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.integrity_audit_runs(id) ON DELETE CASCADE,
  check_key text NOT NULL,
  check_name text NOT NULL,
  severity text NOT NULL DEFAULT 'high',
  project_id uuid,
  entity_type text,
  entity_id uuid,
  expected numeric,
  actual numeric,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.integrity_audit_findings(run_id);
GRANT SELECT ON public.integrity_audit_runs TO authenticated;
GRANT SELECT ON public.integrity_audit_findings TO authenticated;
GRANT ALL ON public.integrity_audit_runs TO service_role;
GRANT ALL ON public.integrity_audit_findings TO service_role;
ALTER TABLE public.integrity_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_audit_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform staff read audit runs" ON public.integrity_audit_runs FOR SELECT TO authenticated
  USING (public.get_platform_role(auth.uid()) IS NOT NULL);
CREATE POLICY "Platform staff read audit findings" ON public.integrity_audit_findings FOR SELECT TO authenticated
  USING (public.get_platform_role(auth.uid()) IS NOT NULL);

CREATE OR REPLACE FUNCTION public.run_integrity_audit(_source text DEFAULT 'manual')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _run uuid;
  _checks int := 12;
  _failed int;
  _count int;
BEGIN
  IF auth.uid() IS NOT NULL AND public.get_platform_role(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  INSERT INTO integrity_audit_runs(trigger_source) VALUES (coalesce(_source,'manual')) RETURNING id INTO _run;

  -- 1. Schedules of values total 0 or 100%
  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'sov_total_100','Schedule of values totals 100%',s.project_id,'project_sov',s.id,100,t.pct,
         'Schedule "'||coalesce(s.sov_name,'')||'" totals '||t.pct||'%'
  FROM project_sov s
  JOIN LATERAL (SELECT round(coalesce(sum(i.percent_of_contract),0),2) pct FROM project_sov_items i WHERE i.sov_id=s.id) t ON true
  WHERE s.source_co_id IS NULL AND t.pct NOT IN (0,100.00) AND abs(t.pct-100) > 0.01;

  -- 2. No contract billed beyond contract + approved changes
  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'contract_overbilled','No contract over-billed',c.project_id,'project_contract',c.id,
         round(coalesce(c.contract_sum,0),2), b.billed, 'Billed more than the contract total'
  FROM project_contracts c
  JOIN LATERAL (SELECT round(coalesce(sum(i.total_amount),0),2) billed FROM invoices i
                WHERE i.contract_id=c.id AND i.status<>'DRAFT' AND i.voided_at IS NULL) b ON true
  WHERE coalesce(c.contract_sum,0) > 0 AND b.billed > round(coalesce(c.contract_sum,0),2) + 0.01;

  -- 3. Invoice line items add up to the invoice subtotal
  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'invoice_lines_match_subtotal','Invoice lines add up to subtotal',i.project_id,'invoice',i.id,
         round(coalesce(i.subtotal,0),2), l.s, 'Invoice '||coalesce(i.invoice_number,'')
  FROM invoices i
  JOIN LATERAL (SELECT round(sum(li.current_billed),2) s, count(*) n FROM invoice_line_items li WHERE li.invoice_id=i.id) l ON true
  WHERE l.n > 0 AND i.voided_at IS NULL AND abs(l.s - round(coalesce(i.subtotal,0),2)) > 0.01;

  -- 4. Invoice retainage within bounds
  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'invoice_retainage_bounds','Retainage between 0 and subtotal',i.project_id,'invoice',i.id,
         i.subtotal, i.retainage_amount, 'Invoice '||coalesce(i.invoice_number,'')
  FROM invoices i
  WHERE i.voided_at IS NULL AND (coalesce(i.retainage_amount,0) < 0 OR coalesce(i.retainage_amount,0) > coalesce(i.subtotal,0) + 0.01);

  -- 5. Non-draft SOV/CO invoices attached to a contract
  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,severity,project_id,entity_type,entity_id,detail)
  SELECT _run,'invoice_has_contract','Invoice attached to a contract','medium',i.project_id,'invoice',i.id,
         'Invoice '||coalesce(i.invoice_number,'')||' has no contract'
  FROM invoices i
  WHERE i.status<>'DRAFT' AND i.voided_at IS NULL AND i.contract_id IS NULL AND i.po_id IS NULL;

  -- 6. Approved change orders keep their origin company
  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,severity,project_id,entity_type,entity_id,detail)
  SELECT _run,'co_has_origin','Approved change order keeps its origin company','medium',co.project_id,'change_order',co.id,
         coalesce(co.co_number,'')||' '||coalesce(co.title,'')
  FROM change_orders co WHERE co.status='approved' AND co.originating_org_id IS NULL;

  -- 7. Change-order billing schedule equals the approved price
  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'co_sov_matches_price','Change-order billing schedule equals approved price',co.project_id,'change_order',co.id,
         round(co.tc_submitted_price,2), l.v, coalesce(co.co_number,'')||' '||coalesce(co.title,'')
  FROM change_orders co
  JOIN LATERAL (SELECT round(sum(sl.scheduled_value),2) v, count(*) n FROM co_sov_lines sl WHERE sl.source_co_id=co.id) l ON true
  WHERE co.status IN ('approved','contracted') AND l.n > 0 AND co.tc_submitted_price IS NOT NULL
    AND abs(l.v - round(co.tc_submitted_price,2)) > 0.01;

  -- 8. Change order never billed twice
  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'co_not_double_billed','Change order not billed beyond its price',co.project_id,'change_order',co.id,
         round(coalesce(co.tc_submitted_price,0),2), b.billed, coalesce(co.co_number,'')||' '||coalesce(co.title,'')
  FROM change_orders co
  JOIN LATERAL (SELECT round(coalesce(sum(li.current_billed),0),2) billed FROM invoice_line_items li
                JOIN invoices i ON i.id=li.invoice_id
                WHERE li.source_co_id=co.id AND i.status<>'DRAFT' AND i.voided_at IS NULL) b ON true
  WHERE co.tc_submitted_price IS NOT NULL AND b.billed > round(co.tc_submitted_price,2) + 0.01;

  -- 9. Only one billing schedule per change order per contract
  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'co_single_sov','One billing schedule per change order',min(s.project_id::text)::uuid,'change_order',s.source_co_id,1,count(*),
         'Duplicate change-order schedules'
  FROM project_sov s WHERE s.source_co_id IS NOT NULL
  GROUP BY s.source_co_id, s.contract_id HAVING count(*) > 1;

  -- 10. Schedule line never billed beyond its value
  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'sov_line_not_overbilled','Schedule line not billed beyond its value',i.project_id,'project_sov_item',i.id,
         round(coalesce(i.scheduled_value, i.value_amount,0),2), round(i.billed_to_date,2), i.item_name
  FROM project_sov_items i
  WHERE coalesce(i.scheduled_value, i.value_amount,0) > 0
    AND coalesce(i.billed_to_date,0) > round(coalesce(i.scheduled_value, i.value_amount,0),2) + 0.01;

  -- 11. Approved change-order totals on contracts match their change orders
  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,severity,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'contract_co_sum','Contract approved-change total matches its change orders','medium',c.project_id,'project_contract',c.id,
         x.s, round(coalesce(c.co_approved_sum,0),2), 'Contract roll-up differs'
  FROM project_contracts c
  JOIN LATERAL (SELECT round(coalesce(sum(co.tc_submitted_price),0),2) s FROM change_orders co
                WHERE co.project_id=c.project_id AND co.status='approved' AND co.org_id=c.from_org_id) x ON true
  WHERE c.co_approved_sum IS NOT NULL AND abs(x.s - round(c.co_approved_sum,2)) > 0.01;

  -- 12. Paid invoices have a paid date; approved have approved date
  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,severity,project_id,entity_type,entity_id,detail)
  SELECT _run,'invoice_status_dates','Invoice status has matching date','low',i.project_id,'invoice',i.id,
         'Invoice '||coalesce(i.invoice_number,'')||' is '||i.status||' without its date'
  FROM invoices i
  WHERE (i.status='PAID' AND i.paid_at IS NULL) OR (i.status='APPROVED' AND i.approved_at IS NULL);

  SELECT count(*), count(DISTINCT check_key) INTO _count, _failed FROM integrity_audit_findings WHERE run_id=_run;
  UPDATE integrity_audit_runs SET finished_at=now(), checks_run=_checks, checks_failed=_failed, findings_count=_count WHERE id=_run;
  RETURN _run;
END;
$$;
REVOKE ALL ON FUNCTION public.run_integrity_audit(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_integrity_audit(text) TO authenticated, service_role;