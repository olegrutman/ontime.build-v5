UPDATE public.change_orders
   SET passed_to_owner = true
 WHERE passed_to_owner IS NULL
   AND coalesce(gc_budget, 0) > 0;