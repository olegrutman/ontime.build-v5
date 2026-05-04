-- Add tax columns to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS sales_tax_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_taxable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_jurisdiction_label text;

-- Add tax snapshot and computed columns to change_orders
ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS tax_rate_snapshot numeric,
  ADD COLUMN IF NOT EXISTS labor_taxable_snapshot boolean,
  ADD COLUMN IF NOT EXISTS materials_tax numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_tax numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS equipment_tax numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tax numeric DEFAULT 0;