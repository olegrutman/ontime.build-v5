-- Drop the stale FK pointing at legacy work_order_catalog
ALTER TABLE public.co_line_items
  DROP CONSTRAINT IF EXISTS co_line_items_catalog_item_id_fkey;

-- Null out any existing values that don't match a row in the active catalog,
-- so the new FK can be applied cleanly.
UPDATE public.co_line_items li
SET catalog_item_id = NULL
WHERE catalog_item_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.catalog_definitions cd WHERE cd.id = li.catalog_item_id
  );

-- Repoint catalog_item_id at the active catalog table the wizard reads from.
ALTER TABLE public.co_line_items
  ADD CONSTRAINT co_line_items_catalog_item_id_fkey
  FOREIGN KEY (catalog_item_id)
  REFERENCES public.catalog_definitions(id)
  ON DELETE SET NULL;
