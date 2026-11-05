CREATE OR REPLACE FUNCTION public.approve_invoice_with_line_rejections(_invoice_id uuid, _rejections jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.invoices%ROWTYPE;
  receiver uuid;
  total_lines int; rej_count int;
  all_sum numeric; rej_sum numeric; rej_ret numeric; rej_total numeric; rej_subtotal numeric;
  new_id uuid; new_no text; n int := 1; summary text;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF inv.status <> 'SUBMITTED' THEN RAISE EXCEPTION 'Only submitted invoices can be reviewed'; END IF;

  IF inv.contract_id IS NOT NULL THEN
    SELECT to_org_id INTO receiver FROM public.project_contracts WHERE id = inv.contract_id;
    IF receiver IS NULL OR NOT public.user_in_org(auth.uid(), receiver) THEN RAISE EXCEPTION 'Only the receiving company can review this invoice'; END IF;
  ELSIF inv.po_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = inv.po_id AND (public.user_in_org(auth.uid(), po.organization_id) OR public.user_in_org(auth.uid(), po.pricing_owner_org_id))) THEN
      RAISE EXCEPTION 'Only the receiving company can review this invoice'; END IF;
  ELSE RAISE EXCEPTION 'Invoice has no billing relationship'; END IF;

  SELECT count(*), coalesce(sum(current_billed),0) INTO total_lines, all_sum FROM public.invoice_line_items WHERE invoice_id = _invoice_id;
  SELECT count(*) INTO rej_count FROM jsonb_array_elements(coalesce(_rejections,'[]'::jsonb)) r
    JOIN public.invoice_line_items li ON li.id = (r->>'line_id')::uuid AND li.invoice_id = _invoice_id;
  IF rej_count <> jsonb_array_length(coalesce(_rejections,'[]'::jsonb)) THEN RAISE EXCEPTION 'Rejected lines must belong to this invoice'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(_rejections,'[]'::jsonb)) r WHERE length(trim(coalesce(r->>'reason',''))) < 3) THEN
    RAISE EXCEPTION 'Each rejected line needs a reason'; END IF;
  IF rej_count > 0 AND rej_count >= total_lines THEN RAISE EXCEPTION 'At least one line must be approved; the whole invoice cannot be rejected'; END IF;

  IF rej_count > 0 THEN
    SELECT coalesce(sum(li.current_billed),0), coalesce(sum(li.retainage_amount),0) INTO rej_sum, rej_ret
      FROM public.invoice_line_items li WHERE li.id IN (SELECT (r->>'line_id')::uuid FROM jsonb_array_elements(_rejections) r);
    -- Scale header amounts by the rejected share of line amounts, so tax lines and retainage stay consistent.
    rej_total := CASE WHEN all_sum > 0 THEN round(inv.total_amount * rej_sum / all_sum, 2) ELSE 0 END;
    rej_subtotal := CASE WHEN all_sum > 0 THEN round(coalesce(inv.subtotal,0) * rej_sum / all_sum, 2) ELSE 0 END;

    LOOP
      new_no := coalesce(nullif(inv.invoice_number,''), 'INV') || '-R' || n;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = new_no AND project_id = inv.project_id);
      n := n + 1;
    END LOOP;
    SELECT string_agg(li.description || ': ' || trim(r->>'reason'), E'\n') INTO summary
      FROM jsonb_array_elements(_rejections) r JOIN public.invoice_line_items li ON li.id = (r->>'line_id')::uuid;

    INSERT INTO public.invoices (project_id, invoice_number, billing_period_start, billing_period_end, status, subtotal, retainage_amount, total_amount,
      notes, submitted_at, submitted_by, rejected_at, rejected_by, rejection_reason, created_by, contract_id, sov_id, po_id, co_ids, split_from_invoice_id)
    VALUES (inv.project_id, new_no, inv.billing_period_start, inv.billing_period_end, 'REJECTED', rej_subtotal, rej_ret, rej_total,
      'Lines returned from ' || coalesce(nullif(inv.invoice_number,''),'invoice'), inv.submitted_at, inv.submitted_by, now(), auth.uid(), summary, inv.created_by, inv.contract_id, inv.sov_id, inv.po_id, inv.co_ids, inv.id)
    RETURNING id INTO new_id;

    UPDATE public.invoice_line_items li SET invoice_id = new_id, rejected_from_invoice_id = _invoice_id, rejection_reason = trim(r->>'reason')
      FROM jsonb_array_elements(_rejections) r WHERE li.id = (r->>'line_id')::uuid;

    UPDATE public.invoices SET subtotal = coalesce(inv.subtotal,0) - rej_subtotal, retainage_amount = coalesce(inv.retainage_amount,0) - rej_ret,
      total_amount = inv.total_amount - rej_total WHERE id = _invoice_id;
  END IF;

  UPDATE public.invoices SET status = 'APPROVED', approved_at = now(), approved_by = auth.uid() WHERE id = _invoice_id;
  PERFORM public.update_sov_billing_totals(inv.project_id);
  INSERT INTO public.project_activity (project_id, activity_type, description, actor_user_id)
  VALUES (inv.project_id, 'INVOICE_APPROVED', 'Invoice ' || coalesce(nullif(inv.invoice_number,''),'') || ' approved' ||
    CASE WHEN rej_count > 0 THEN '; ' || rej_count || ' line(s) returned as ' || new_no ELSE '' END, auth.uid());
  RETURN new_id;
END $$;