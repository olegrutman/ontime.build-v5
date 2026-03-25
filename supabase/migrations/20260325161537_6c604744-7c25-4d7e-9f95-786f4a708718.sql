
-- Add new building definition columns to project_profiles
ALTER TABLE public.project_profiles
  ADD COLUMN IF NOT EXISTS framing_system text,
  ADD COLUMN IF NOT EXISTS floor_system text,
  ADD COLUMN IF NOT EXISTS roof_system text,
  ADD COLUMN IF NOT EXISTS structure_type text,
  ADD COLUMN IF NOT EXISTS has_corridors boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS corridor_type text,
  ADD COLUMN IF NOT EXISTS has_balcony boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_deck boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_covered_porch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deck_porch_type text,
  ADD COLUMN IF NOT EXISTS entry_type text DEFAULT 'Standard',
  ADD COLUMN IF NOT EXISTS special_rooms text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stories_per_unit integer;

-- Insert Hotel project type
INSERT INTO public.project_types (id, name, slug, is_multifamily, is_single_family, is_commercial, default_stories, default_units_per_building, default_number_of_buildings)
VALUES (gen_random_uuid(), 'Hotel', 'hotel', false, false, true, 5, NULL, 1)
ON CONFLICT DO NOTHING;
