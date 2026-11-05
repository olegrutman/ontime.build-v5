DO $$ DECLARE src text; BEGIN
  SELECT pg_get_functiondef('public.approve_invoice_with_line_rejections(uuid,jsonb)'::regprocedure) INTO src;
  src := replace(src, 'rej_subtotal := CASE WHEN all_sum > 0 THEN round(coalesce(inv.subtotal,0) * rej_sum / all_sum, 2) ELSE 0 END;',
    '-- Subtotal excludes tax lines on order invoices, so the kept part keeps at most its own line sum.
    rej_subtotal := coalesce(inv.subtotal,0) - least(coalesce(inv.subtotal,0), all_sum - rej_sum);');
  EXECUTE src;
END $$;