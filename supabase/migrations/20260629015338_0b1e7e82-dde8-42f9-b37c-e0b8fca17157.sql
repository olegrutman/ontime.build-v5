ALTER TABLE public.change_orders
  DROP CONSTRAINT IF EXISTS change_orders_parent_co_id_fkey;

ALTER TABLE public.change_orders
  ADD CONSTRAINT change_orders_parent_co_id_fkey
  FOREIGN KEY (parent_co_id)
  REFERENCES public.change_orders(id)
  ON DELETE SET NULL;

ALTER TABLE public.change_orders
  DROP CONSTRAINT IF EXISTS change_orders_combined_co_id_fkey;

ALTER TABLE public.change_orders
  ADD CONSTRAINT change_orders_combined_co_id_fkey
  FOREIGN KEY (combined_co_id)
  REFERENCES public.change_orders(id)
  ON DELETE SET NULL;