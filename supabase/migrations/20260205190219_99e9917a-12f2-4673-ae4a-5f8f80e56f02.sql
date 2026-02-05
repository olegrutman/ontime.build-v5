-- Add pack support to supplier_estimate_items
ALTER TABLE public.supplier_estimate_items
  ADD COLUMN IF NOT EXISTS pack_name text,
  ADD COLUMN IF NOT EXISTS catalog_item_id uuid REFERENCES public.catalog_items(id);

-- Add pack_modified flag to purchase_orders
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS pack_modified boolean DEFAULT false;

-- Index for grouping by pack
CREATE INDEX IF NOT EXISTS idx_supplier_estimate_items_pack_name 
  ON public.supplier_estimate_items(estimate_id, pack_name);

-- Index for catalog matching lookups
CREATE INDEX IF NOT EXISTS idx_supplier_estimate_items_catalog 
  ON public.supplier_estimate_items(catalog_item_id) WHERE catalog_item_id IS NOT NULL;