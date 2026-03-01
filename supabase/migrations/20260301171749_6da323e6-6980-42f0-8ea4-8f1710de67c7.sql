
-- Phase 1: Add pricing traceability columns to po_line_items
ALTER TABLE public.po_line_items
  ADD COLUMN source_estimate_item_id uuid REFERENCES public.supplier_estimate_items(id),
  ADD COLUMN source_pack_name text,
  ADD COLUMN price_source text,
  ADD COLUMN original_unit_price numeric,
  ADD COLUMN price_adjusted_by_supplier boolean NOT NULL DEFAULT false,
  ADD COLUMN adjustment_reason text;

-- Phase 1: Add totals columns to purchase_orders
ALTER TABLE public.purchase_orders
  ADD COLUMN po_subtotal_estimate_items numeric,
  ADD COLUMN po_subtotal_non_estimate_items numeric,
  ADD COLUMN po_subtotal_total numeric,
  ADD COLUMN po_tax_total numeric,
  ADD COLUMN po_total numeric,
  ADD COLUMN tax_percent_applied numeric;
