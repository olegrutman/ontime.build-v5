ALTER TABLE public.project_scope_details
  ADD COLUMN IF NOT EXISTS total_sqft integer,
  ADD COLUMN IF NOT EXISTS lot_size_acres numeric(6,2),
  ADD COLUMN IF NOT EXISTS bedrooms integer,
  ADD COLUMN IF NOT EXISTS bathrooms numeric(3,1),
  ADD COLUMN IF NOT EXISTS garage_type text,
  ADD COLUMN IF NOT EXISTS garage_cars integer,
  ADD COLUMN IF NOT EXISTS framing_method text;