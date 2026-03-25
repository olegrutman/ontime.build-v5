
-- Contract scope categories (seed table)
CREATE TABLE public.contract_scope_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_scope_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read scope categories" ON public.contract_scope_categories FOR SELECT TO authenticated USING (true);

-- Seed categories
INSERT INTO public.contract_scope_categories (slug, label, display_order) VALUES
  ('framing', 'Framing', 1),
  ('sheathing', 'Sheathing', 2),
  ('wrb', 'Weather Barrier (WRB)', 3),
  ('windows', 'Windows Installation', 4),
  ('exterior_doors', 'Exterior Doors Installation', 5),
  ('siding', 'Siding', 6),
  ('exterior_trim', 'Exterior Trim', 7),
  ('soffit_fascia', 'Soffit & Fascia', 8),
  ('decks_railings', 'Decks & Railings', 9),
  ('garage_framing', 'Garage Framing', 10),
  ('interior_blocking', 'Interior Blocking', 11),
  ('stairs', 'Stairs', 12),
  ('other', 'Other', 13);

-- Contract scope selections (which categories are included per contract)
CREATE TABLE public.contract_scope_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.project_contracts(id) ON DELETE CASCADE,
  category_slug text NOT NULL REFERENCES public.contract_scope_categories(slug),
  is_included boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, category_slug)
);

ALTER TABLE public.contract_scope_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage contract scope selections" ON public.contract_scope_selections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Contract scope details (per-category detail key/value pairs)
CREATE TABLE public.contract_scope_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_id uuid NOT NULL REFERENCES public.contract_scope_selections(id) ON DELETE CASCADE,
  detail_key text NOT NULL,
  detail_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (selection_id, detail_key)
);

ALTER TABLE public.contract_scope_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage contract scope details" ON public.contract_scope_details FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Contract scope exclusions
CREATE TABLE public.contract_scope_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.project_contracts(id) ON DELETE CASCADE,
  exclusion_label text NOT NULL,
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_scope_exclusions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage contract scope exclusions" ON public.contract_scope_exclusions FOR ALL TO authenticated USING (true) WITH CHECK (true);
