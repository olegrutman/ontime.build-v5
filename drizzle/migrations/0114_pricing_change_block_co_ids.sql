CREATE OR REPLACE FUNCTION public._co_pricing_change_block(c public.change_orders)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN c.status IN ('withdrawn','rejected') THEN 'This order is withdrawn or rejected.'
    WHEN c.completed_at IS NOT NULL THEN 'This order is closed out.'
    WHEN EXISTS (SELECT 1 FROM public.invoices i WHERE upper(i.status::text)<>'REJECTED'
                 AND (c.id::text = ANY(i.co_ids::text[]) OR EXISTS (SELECT 1 FROM public.invoice_line_items l WHERE l.invoice_id=i.id AND l.source_co_id::text=c.id::text)))
      THEN 'This order has already been invoiced.'
    ELSE NULL END
$$;
REVOKE ALL ON FUNCTION public._co_pricing_change_block(public.change_orders) FROM public, anon, authenticated;