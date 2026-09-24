CREATE OR REPLACE FUNCTION public._audit_co_total(_co_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT round(coalesce(nullif(public.co_grand_total(co.id),0), co.tc_submitted_price, 0),2)
  FROM public.change_orders co WHERE co.id = _co_id;
$$;
REVOKE ALL ON FUNCTION public._audit_co_total(uuid) FROM PUBLIC, anon, authenticated;

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

  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'sov_total_100','Schedule of values totals 100%',s.project_id,'project_sov',s.id,100,t.pct,
         'Schedule "'||coalesce(s.sov_name,'')||'" totals '||t.pct||'%'
  FROM project_sov s
  JOIN LATERAL (SELECT round(coalesce(sum(i.percent_of_contract),0),2) pct FROM project_sov_items i WHERE i.sov_id=s.id) t ON true
  WHERE s.source_co_id IS NULL AND t.pct NOT IN (0,100.00) AND abs(t.pct-100) > 0.01;

  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'contract_overbilled','No contract over-billed',c.project_id,'project_contract',c.id,
         round(coalesce(c.contract_sum,0),2), b.billed, 'Billed more than the contract total'
  FROM project_contracts c
  JOIN LATERAL (SELECT round(coalesce(sum(i.total_amount),0),2) billed FROM invoices i
                WHERE i.contract_id=c.id AND i.status<>'DRAFT' AND i.voided_at IS NULL) b ON true
  WHERE coalesce(c.contract_sum,0) > 0 AND b.billed > round(coalesce(c.contract_sum,0),2) + 0.01;

  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'invoice_lines_match_subtotal','Invoice lines add up to subtotal',i.project_id,'invoice',i.id,
         round(coalesce(i.subtotal,0),2), l.s, 'Invoice '||coalesce(i.invoice_number,'')
  FROM invoices i
  JOIN LATERAL (SELECT round(sum(li.current_billed),2) s, count(*) n FROM invoice_line_items li WHERE li.invoice_id=i.id) l ON true
  WHERE l.n > 0 AND i.voided_at IS NULL
    AND abs(l.s - round(coalesce(i.subtotal,0),2)) > 0.01
    AND abs(l.s - round(coalesce(i.total_amount,0) + coalesce(i.retainage_amount,0),2)) > 0.01;

  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'invoice_retainage_bounds','Retainage between 0 and subtotal',i.project_id,'invoice',i.id,
         i.subtotal, i.retainage_amount, 'Invoice '||coalesce(i.invoice_number,'')
  FROM invoices i
  WHERE i.voided_at IS NULL AND (coalesce(i.retainage_amount,0) < 0 OR coalesce(i.retainage_amount,0) > coalesce(i.subtotal,0) + 0.01);

  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,severity,project_id,entity_type,entity_id,detail)
  SELECT _run,'invoice_has_contract','Invoice attached to a contract','medium',i.project_id,'invoice',i.id,
         'Invoice '||coalesce(i.invoice_number,'')||' has no contract'
  FROM invoices i
  WHERE i.status<>'DRAFT' AND i.voided_at IS NULL AND i.contract_id IS NULL AND i.po_id IS NULL;

  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,severity,project_id,entity_type,entity_id,detail)
  SELECT _run,'co_has_origin','Approved change order keeps its origin company','medium',co.project_id,'change_order',co.id,
         coalesce(co.co_number,'')||' '||coalesce(co.title,'')
  FROM change_orders co WHERE co.status='approved' AND co.originating_org_id IS NULL;

  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'co_sov_matches_price','Change-order billing schedule equals approved total',co.project_id,'change_order',co.id,
         g.t, l.v, coalesce(co.co_number,'')||' '||coalesce(co.title,'')
  FROM change_orders co
  JOIN LATERAL (SELECT public._audit_co_total(co.id) t) g ON true
  JOIN LATERAL (SELECT round(sum(coalesce(i.value_amount,i.scheduled_value,0)),2) v, count(*) n
                FROM project_sov s JOIN project_sov_items i ON i.sov_id=s.id WHERE s.source_co_id=co.id) l ON true
  WHERE co.status IN ('approved','contracted','completed') AND l.n > 0 AND abs(l.v - g.t) > 0.01;

  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'co_not_double_billed','Change order not billed beyond its price',co.project_id,'change_order',co.id,
         public._audit_co_total(co.id), b.billed, coalesce(co.co_number,'')||' '||coalesce(co.title,'')
  FROM change_orders co
  JOIN LATERAL (SELECT round(coalesce(sum(li.current_billed),0),2) billed FROM invoice_line_items li
                JOIN invoices i ON i.id=li.invoice_id
                WHERE li.source_co_id=co.id AND i.status<>'DRAFT' AND i.voided_at IS NULL) b ON true
  WHERE b.billed > public._audit_co_total(co.id) + 0.01;

  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'co_single_sov','One billing schedule per change order',min(s.project_id::text)::uuid,'change_order',s.source_co_id,1,count(*),
         'Duplicate change-order schedules'
  FROM project_sov s WHERE s.source_co_id IS NOT NULL
  GROUP BY s.source_co_id, s.contract_id HAVING count(*) > 1;

  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'sov_line_not_overbilled','Schedule line not billed beyond its value',i.project_id,'project_sov_item',i.id,
         round(coalesce(i.scheduled_value, i.value_amount,0),2), round(i.billed_to_date,2), i.item_name
  FROM project_sov_items i
  WHERE coalesce(i.scheduled_value, i.value_amount,0) > 0
    AND coalesce(i.billed_to_date,0) > round(coalesce(i.scheduled_value, i.value_amount,0),2) + 0.01;

  INSERT INTO integrity_audit_findings(run_id,check_key,check_name,severity,project_id,entity_type,entity_id,expected,actual,detail)
  SELECT _run,'contract_co_sum','Contract approved-change total matches its change orders','medium',c.project_id,'project_contract',c.id,
         x.s, round(coalesce(c.co_approved_sum,0),2), 'Contract roll-up differs'
  FROM project_contracts c
  JOIN LATERAL (SELECT round(coalesce(sum(public._audit_co_total(co.id)),0),2) s FROM change_orders co
                WHERE co.project_id=c.project_id AND co.status IN ('approved','contracted','completed')
                  AND co.approved_at IS NOT NULL
                  AND public._co_target_contract_id(co.project_id, co.org_id, co.assigned_to_org_id)=c.id) x ON true
  WHERE abs(x.s - round(coalesce(c.co_approved_sum,0),2)) > 0.01;

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