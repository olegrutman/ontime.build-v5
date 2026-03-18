-- Link purchase orders back to change orders for supplier-pricing workflow
ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS source_change_order_id uuid NULL;

ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS source_change_order_material_request boolean NOT NULL DEFAULT false;

ALTER TABLE public.po_line_items
ADD COLUMN IF NOT EXISTS source_co_material_item_id uuid NULL;

-- Helpful indexes for reverse lookups from CO detail screens
CREATE INDEX IF NOT EXISTS idx_purchase_orders_source_change_order_id
ON public.purchase_orders (source_change_order_id);

CREATE INDEX IF NOT EXISTS idx_po_line_items_source_co_material_item_id
ON public.po_line_items (source_co_material_item_id);

-- Foreign keys for traceability
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_orders_source_change_order_id_fkey'
  ) THEN
    ALTER TABLE public.purchase_orders
    ADD CONSTRAINT purchase_orders_source_change_order_id_fkey
    FOREIGN KEY (source_change_order_id)
    REFERENCES public.change_orders(id)
    ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'po_line_items_source_co_material_item_id_fkey'
  ) THEN
    ALTER TABLE public.po_line_items
    ADD CONSTRAINT po_line_items_source_co_material_item_id_fkey
    FOREIGN KEY (source_co_material_item_id)
    REFERENCES public.co_material_items(id)
    ON DELETE SET NULL;
  END IF;
END $$;