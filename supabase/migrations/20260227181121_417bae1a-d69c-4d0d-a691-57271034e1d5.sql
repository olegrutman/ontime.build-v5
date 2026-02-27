ALTER TABLE supplier_estimate_items
  ADD COLUMN IF NOT EXISTS pieces_per_unit integer;