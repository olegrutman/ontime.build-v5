-- =========================================================
-- Layer 1: Seed Interior Finishes catalog branch (platform)
-- =========================================================
INSERT INTO public.catalog_definitions
  (slug, kind, is_platform, org_id, canonical_name, division, category, unit, applicable_zone, applicable_work_types, applicable_reasons, search_text, aliases, sort_order)
VALUES
  -- Ceiling finishes
  ('if_tg_wood_ceiling',     'scope', true, NULL, 'T&G wood ceiling — install',          'interior_finish', 'ceiling_finish', 'SF', 'interior_ceiling',
    ARRAY['remodel','new_construction','repair'], ARRAY['addition','design_change','owner_request','gc_request'],
    't&g tongue and groove tongue & groove wood ceiling plank install interior finish',
    ARRAY['t&g','tongue and groove','tongue & groove','tg ceiling','plank ceiling','wood ceiling','t and g'], 10),

  ('if_shiplap_ceiling',     'scope', true, NULL, 'Shiplap ceiling — install',           'interior_finish', 'ceiling_finish', 'SF', 'interior_ceiling',
    ARRAY['remodel','new_construction','repair'], ARRAY['addition','design_change','owner_request','gc_request'],
    'shiplap ceiling install interior finish wood plank',
    ARRAY['shiplap','ship lap','wood ceiling'], 20),

  ('if_beadboard_ceiling',   'scope', true, NULL, 'Beadboard ceiling — install',         'interior_finish', 'ceiling_finish', 'SF', 'interior_ceiling',
    ARRAY['remodel','new_construction','repair'], ARRAY['addition','design_change','owner_request','gc_request'],
    'beadboard bead board ceiling install interior finish',
    ARRAY['beadboard','bead board','porch ceiling'], 30),

  ('if_wood_plank_ceiling',  'scope', true, NULL, 'Wood plank ceiling — install',        'interior_finish', 'ceiling_finish', 'SF', 'interior_ceiling',
    ARRAY['remodel','new_construction','repair'], ARRAY['addition','design_change','owner_request','gc_request'],
    'wood plank ceiling install interior finish',
    ARRAY['plank ceiling','wood ceiling','reclaimed wood ceiling'], 40),

  ('if_decorative_beams',    'scope', true, NULL, 'Decorative ceiling beams — install',  'interior_finish', 'ceiling_finish', 'LF', 'interior_ceiling',
    ARRAY['remodel','new_construction'],          ARRAY['addition','design_change','owner_request','gc_request'],
    'decorative beams faux beams ceiling install interior finish',
    ARRAY['faux beams','box beams','decorative beam'], 50),

  ('if_ceiling_trim',        'scope', true, NULL, 'Ceiling perimeter trim — install',    'interior_finish', 'ceiling_finish', 'LF', 'interior_ceiling',
    ARRAY['remodel','new_construction','repair'], ARRAY['addition','design_change','owner_request','gc_request'],
    'ceiling perimeter trim crown molding install',
    ARRAY['crown molding','ceiling trim','perimeter trim'], 60),

  -- Wall finishes
  ('if_tg_wood_wall',        'scope', true, NULL, 'T&G wood wall paneling — install',    'interior_finish', 'wall_finish', 'SF', 'interior_wall',
    ARRAY['remodel','new_construction','repair'], ARRAY['addition','design_change','owner_request','gc_request'],
    't&g tongue and groove wood wall paneling install interior finish',
    ARRAY['t&g wall','wood paneling','wall paneling','tongue and groove wall'], 110),

  ('if_shiplap_wall',        'scope', true, NULL, 'Shiplap wall — install',              'interior_finish', 'wall_finish', 'SF', 'interior_wall',
    ARRAY['remodel','new_construction','repair'], ARRAY['addition','design_change','owner_request','gc_request'],
    'shiplap wall install interior finish accent wall',
    ARRAY['shiplap wall','ship lap wall','accent wall'], 120),

  ('if_wainscot',            'scope', true, NULL, 'Wainscot — install',                  'interior_finish', 'wall_finish', 'SF', 'interior_wall',
    ARRAY['remodel','new_construction','repair'], ARRAY['addition','design_change','owner_request','gc_request'],
    'wainscot wainscoting paneling install interior finish',
    ARRAY['wainscoting','wainscot','board and batten'], 130),

  ('if_accent_wall',         'scope', true, NULL, 'Accent wood wall — install',          'interior_finish', 'wall_finish', 'SF', 'interior_wall',
    ARRAY['remodel','new_construction'],          ARRAY['addition','design_change','owner_request','gc_request'],
    'accent wood wall feature wall install interior finish',
    ARRAY['feature wall','accent wall','wood accent'], 140),

  -- Prep
  ('if_furring_strips',      'scope', true, NULL, 'Furring strips for wood ceiling/wall','interior_finish', 'prep', 'SF', 'any',
    ARRAY['remodel','new_construction','repair'], ARRAY['addition','design_change','owner_request','gc_request'],
    'furring strips substrate prep wood ceiling wall',
    ARRAY['furring','strapping','sleepers'], 210),

  ('if_substrate_prep',      'scope', true, NULL, 'Substrate prep / blocking — interior finish', 'interior_finish', 'prep', 'SF', 'any',
    ARRAY['remodel','new_construction','repair'], ARRAY['addition','design_change','owner_request','gc_request'],
    'substrate prep blocking interior finish wood ceiling wall',
    ARRAY['substrate prep','blocking','plywood backer'], 220)
ON CONFLICT (slug) DO NOTHING;

-- =========================================================
-- Layer 2: Allow org admins to manage their org's catalog
-- =========================================================

-- INSERT: org admins can add items scoped to their own org (never platform rows).
CREATE POLICY "Org admins can insert org catalog items"
ON public.catalog_definitions
FOR INSERT
TO authenticated
WITH CHECK (
  is_platform = false
  AND org_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_org_roles uor
    WHERE uor.user_id = auth.uid()
      AND uor.organization_id = catalog_definitions.org_id
      AND COALESCE(uor.is_admin, false) = true
  )
);

-- UPDATE: org admins can update their org's items (not platform rows).
CREATE POLICY "Org admins can update org catalog items"
ON public.catalog_definitions
FOR UPDATE
TO authenticated
USING (
  is_platform = false
  AND org_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_org_roles uor
    WHERE uor.user_id = auth.uid()
      AND uor.organization_id = catalog_definitions.org_id
      AND COALESCE(uor.is_admin, false) = true
  )
)
WITH CHECK (
  is_platform = false
  AND org_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_org_roles uor
    WHERE uor.user_id = auth.uid()
      AND uor.organization_id = catalog_definitions.org_id
      AND COALESCE(uor.is_admin, false) = true
  )
);

-- DELETE: org admins can remove their org's items (not platform rows).
CREATE POLICY "Org admins can delete org catalog items"
ON public.catalog_definitions
FOR DELETE
TO authenticated
USING (
  is_platform = false
  AND org_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_org_roles uor
    WHERE uor.user_id = auth.uid()
      AND uor.organization_id = catalog_definitions.org_id
      AND COALESCE(uor.is_admin, false) = true
  )
);
