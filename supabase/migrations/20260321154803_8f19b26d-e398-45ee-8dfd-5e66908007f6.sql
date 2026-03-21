
-- ============================================================
-- 1. project_types (lookup / seed)
-- ============================================================
CREATE TABLE public.project_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  is_multifamily boolean NOT NULL DEFAULT false,
  is_single_family boolean NOT NULL DEFAULT false,
  is_commercial boolean NOT NULL DEFAULT false,
  default_stories int NOT NULL DEFAULT 2,
  default_units_per_building int,
  default_number_of_buildings int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read project_types" ON public.project_types FOR SELECT TO authenticated USING (true);

INSERT INTO public.project_types (name, slug, is_multifamily, is_single_family, is_commercial, default_stories, default_units_per_building, default_number_of_buildings) VALUES
  ('Apartment / Condo', 'apartment', true, false, false, 3, 36, 10),
  ('Townhome / PUD', 'townhome', true, false, false, 3, 8, 1),
  ('Custom Home', 'custom_home', false, true, false, 2, NULL, 1),
  ('Production Home', 'production_home', false, true, false, 2, NULL, 1),
  ('Commercial', 'commercial', false, false, true, 2, NULL, 1),
  ('Mixed-Use', 'mixed_use', true, false, true, 4, 20, 1);

-- ============================================================
-- 2. project_profiles
-- ============================================================
CREATE TABLE public.project_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  project_type_id uuid NOT NULL REFERENCES public.project_types(id),
  stories int NOT NULL DEFAULT 2,
  units_per_building int,
  number_of_buildings int NOT NULL DEFAULT 1,
  foundation_types text[] NOT NULL DEFAULT '{}',
  roof_type text,
  has_garage boolean NOT NULL DEFAULT false,
  garage_types text[] NOT NULL DEFAULT '{}',
  has_basement boolean NOT NULL DEFAULT false,
  basement_type text,
  has_stairs boolean NOT NULL DEFAULT false,
  stair_types text[] NOT NULL DEFAULT '{}',
  has_deck_balcony boolean NOT NULL DEFAULT false,
  has_pool boolean NOT NULL DEFAULT false,
  has_elevator boolean NOT NULL DEFAULT false,
  has_clubhouse boolean NOT NULL DEFAULT false,
  has_commercial_spaces boolean NOT NULL DEFAULT false,
  has_shed boolean NOT NULL DEFAULT false,
  is_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

ALTER TABLE public.project_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project participants can view profiles" ON public.project_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_team pt
      WHERE pt.project_id = project_profiles.project_id
        AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY "Project creator can manage profile" ON public.project_profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_profiles.project_id
        AND p.organization_id IN (
          SELECT uor.organization_id FROM public.user_org_roles uor WHERE uor.user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_profiles.project_id
        AND p.organization_id IN (
          SELECT uor.organization_id FROM public.user_org_roles uor WHERE uor.user_id = auth.uid()
        )
    )
  );

-- ============================================================
-- 3. scope_sections (seed)
-- ============================================================
CREATE TABLE public.scope_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  always_visible boolean NOT NULL DEFAULT false,
  required_feature text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scope_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read scope_sections" ON public.scope_sections FOR SELECT TO authenticated USING (true);

INSERT INTO public.scope_sections (slug, label, display_order, always_visible, required_feature, description) VALUES
  ('foundation',          'Foundation',                1,  true,  NULL,                    'Foundation layout, embeds, and hardware'),
  ('interior_framing',    'Interior Framing',          2,  true,  NULL,                    'Partitions, blocking, fire stopping, rough-ins'),
  ('floor_systems',       'Floor Systems',             3,  true,  NULL,                    'Floor trusses, framing, and subfloor by level'),
  ('roof',                'Roof',                      4,  true,  NULL,                    'Trusses, sheathing, fascia, and specialty framing'),
  ('sheathing_wrb',       'Sheathing & WRB',           5,  true,  NULL,                    'Exterior sheathing, house wrap, and transitions'),
  ('windows_doors',       'Windows & Doors',           6,  true,  NULL,                    'Window and door installation scope'),
  ('siding',              'Siding & Exterior Trim',    7,  true,  NULL,                    'Siding, trim, soffits, and exterior finish'),
  ('decks_balconies',     'Decks & Balconies',         8,  false, 'has_deck_balcony',      'Balcony framing, decking, and railings'),
  ('garage',              'Garage',                    9,  false, 'has_garage',            'Garage framing, doors, and fire separation'),
  ('basement',            'Basement',                  10, false, 'has_basement',          'Below-grade framing and egress'),
  ('stairs',              'Stairs',                    11, false, 'has_stairs',            'Interior and exterior stair scope'),
  ('pool',                'Pool / Spa',                12, false, 'has_pool',              'Pool equipment room and deck framing'),
  ('elevator_shaft',      'Elevator Shaft',            13, false, 'has_elevator',          'Elevator shaft and machine room framing'),
  ('clubhouse_amenity',   'Clubhouse / Amenity',       14, false, 'has_clubhouse',         'Separate amenity building scope'),
  ('commercial_spaces',   'Commercial / Retail Spaces',15, false, 'has_commercial_spaces', 'Ground-floor commercial framing'),
  ('shed_outbuilding',    'Shed / Outbuilding',        16, false, 'has_shed',              'Accessory structure framing'),
  ('hardware_backout',    'Hardware & Backout',         17, true,  NULL,                    'Holdowns, punchlist, and final inspections');

-- ============================================================
-- 4. scope_items (seed)
-- ============================================================
CREATE TABLE public.scope_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.scope_sections(id) ON DELETE CASCADE,
  label text NOT NULL,
  item_type text NOT NULL DEFAULT 'STD',
  default_on boolean NOT NULL DEFAULT true,
  required_feature text,
  excluded_project_types text[] NOT NULL DEFAULT '{}',
  only_project_types text[],
  display_order int NOT NULL DEFAULT 0,
  min_stories int,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scope_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read scope_items" ON public.scope_items FOR SELECT TO authenticated USING (true);

-- Foundation
INSERT INTO public.scope_items (section_id, label, item_type, default_on, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.display_order
FROM public.scope_sections s, (VALUES
  ('Wet embeds and structural hardware','STD',true,1),
  ('Anchor bolts, holdowns, and post bases','STD',true,2),
  ('Shim sill plates','STD',true,3),
  ('HVAC slab pads','OPT',false,4),
  ('Building layout — all buildings','STD',true,5),
  ('Floor-to-floor layout — all levels','STD',true,6)
) AS v(label, item_type, default_on, display_order) WHERE s.slug = 'foundation';

-- Interior framing
INSERT INTO public.scope_items (section_id, label, item_type, default_on, excluded_project_types, only_project_types, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.excluded::text[], v.only_types::text[], v.display_order
FROM public.scope_sections s, (VALUES
  ('All interior partitions','STD',true,'{}',NULL,1),
  ('All rough openings','STD',true,'{}',NULL,2),
  ('Telecom room — full-height blocking','STD',true,'{}',NULL,3),
  ('Kitchen island framing','STD',true,'{commercial}',NULL,4),
  ('Balloon framing','OPT',false,'{}',NULL,5),
  ('Vertical draft stops between floors','STD',true,'{}',NULL,6),
  ('Fire stopping in walls, floors, and roof','STD',true,'{}',NULL,7),
  ('Gypsum fire barrier continuity','STD',true,'{}',NULL,8),
  ('Prerock in inaccessible areas','STD',true,'{}',NULL,9),
  ('Grab bars','STD',true,'{}',NULL,10),
  ('TV mounts','STD',true,'{commercial}',NULL,11),
  ('Bath hardware — shower, toilet, towel bars','STD',true,'{commercial}',NULL,12),
  ('Cabinets','STD',true,'{}',NULL,13),
  ('Wall-mounted sinks','STD',true,'{}',NULL,14),
  ('Water heater','STD',true,'{commercial}',NULL,15),
  ('Railings','STD',true,'{}',NULL,16),
  ('Water fountains','OPT',false,'{}',NULL,17),
  ('Mailbox station openings','OPT',false,'{}','{apartment,townhome,mixed_use}',18),
  ('Deadwood at subfloor panel ends','STD',true,'{}',NULL,19),
  ('Drop soffits','OPT',false,'{}',NULL,20),
  ('Fan coil unit framing and access door','OPT',false,'{}',NULL,21),
  ('Attic access framing','STD',true,'{}',NULL,22),
  ('Insulation in areas inaccessible after frame closes','STD',true,'{}',NULL,23)
) AS v(label, item_type, default_on, excluded, only_types, display_order) WHERE s.slug = 'interior_framing';

-- Floor systems
INSERT INTO public.scope_items (section_id, label, item_type, default_on, min_stories, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.min_stories, v.display_order
FROM public.scope_sections s, (VALUES
  ('1st floor framing','STD',true,NULL,1),
  ('2nd floor trusses','STD',true,2,2),
  ('2nd floor framing','STD',true,2,3),
  ('3rd floor trusses','STD',true,3,4),
  ('3rd floor framing','STD',true,3,5),
  ('4th floor trusses','OPT',false,4,6),
  ('4th floor framing','OPT',false,4,7),
  ('Mezzanine level','OPT',false,NULL,8),
  ('Subfloor — glued and nailed','STD',true,NULL,9),
  ('Point load transfer to bearing walls','STD',true,NULL,10),
  ('Steel beams set in wood construction','OPT',false,NULL,11)
) AS v(label, item_type, default_on, min_stories, display_order) WHERE s.slug = 'floor_systems';

-- Roof
INSERT INTO public.scope_items (section_id, label, item_type, default_on, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.display_order
FROM public.scope_sections s, (VALUES
  ('Roof trusses per shop drawings','STD',true,1),
  ('All bracing and connections','STD',true,2),
  ('Gable overhangs','STD',true,3),
  ('Crickets','STD',true,4),
  ('HVAC pads set into trusses','STD',true,5),
  ('Roof sheathing','STD',true,6),
  ('Fascia and sub-fascia','STD',true,7),
  ('Gable louver vent rough openings','STD',true,8),
  ('Attic vent openings','STD',true,9),
  ('Roof parapet framing and wood coping','OPT',false,10),
  ('Roof deck or patio deck','OPT',false,11),
  ('Roof hatch framing','OPT',false,12),
  ('Skylight rough opening','OPT',false,13)
) AS v(label, item_type, default_on, display_order) WHERE s.slug = 'roof';

-- Sheathing & WRB
INSERT INTO public.scope_items (section_id, label, item_type, default_on, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.display_order
FROM public.scope_sections s, (VALUES
  ('Exterior sheathing','STD',true,1),
  ('Integral insulation sheathing','OPT',false,2),
  ('House wrap / WRB','STD',true,3),
  ('All opening treatments','STD',true,4),
  ('Window drip caps and sill pans','STD',true,5),
  ('Base of wall transitions','STD',true,6),
  ('Patio and deck transitions','STD',true,7),
  ('Penetration sealing','STD',true,8)
) AS v(label, item_type, default_on, display_order) WHERE s.slug = 'sheathing_wrb';

-- Windows & doors
INSERT INTO public.scope_items (section_id, label, item_type, default_on, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.display_order
FROM public.scope_sections s, (VALUES
  ('Vinyl windows','STD',true,1),
  ('Sliding glass doors','STD',true,2),
  ('Sill back-dam','STD',true,3),
  ('Interior caulk at jambs','STD',true,4),
  ('Exterior doors','STD',true,5),
  ('Sill pans','STD',true,6),
  ('Storefront systems','OPT',false,7)
) AS v(label, item_type, default_on, display_order) WHERE s.slug = 'windows_doors';

-- Siding
INSERT INTO public.scope_items (section_id, label, item_type, default_on, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.display_order
FROM public.scope_sections s, (VALUES
  ('Horizontal siding','STD',true,1),
  ('Vertical siding','OPT',false,2),
  ('Fiber cement trim','STD',true,3),
  ('Penetration cuts and sealing','STD',true,4),
  ('Corbels','OPT',false,5),
  ('Shutters','OPT',false,6),
  ('Soffits','STD',true,7),
  ('Trellis and awning backup walls','OPT',false,8),
  ('Stain-grade exposed lumber','OPT',false,9),
  ('Shim bottom plates','STD',true,10),
  ('Shim and shave exterior walls','STD',true,11),
  ('Stud replacement after MEP punch','STD',true,12)
) AS v(label, item_type, default_on, display_order) WHERE s.slug = 'siding';

-- Decks & balconies
INSERT INTO public.scope_items (section_id, label, item_type, default_on, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.display_order
FROM public.scope_sections s, (VALUES
  ('Balcony framing','STD',true,1),
  ('Guard rail post blocking','STD',true,2),
  ('Finish balconies','STD',true,3),
  ('Patio transition framing','STD',true,4),
  ('Rooftop deck framing','OPT',false,5),
  ('Exterior egress stairs','OPT',false,6),
  ('Composite decking','STD',true,7),
  ('Composite trims and fascia','STD',true,8),
  ('Hidden fastener system','OPT',false,9),
  ('Wood decking','OPT',false,10),
  ('IPE / hardwood','OPT',false,11)
) AS v(label, item_type, default_on, display_order) WHERE s.slug = 'decks_balconies';

-- Garage
INSERT INTO public.scope_items (section_id, label, item_type, default_on, required_feature, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.required_feature, v.display_order
FROM public.scope_sections s, (VALUES
  ('Garage framing','STD',true,NULL,1),
  ('Garage door rough opening','STD',true,NULL,2),
  ('Garage door header','STD',true,NULL,3),
  ('Tuck-under framing','OPT',false,'garage_types_tuck_under',4),
  ('Carport framing','OPT',false,'garage_types_carport',5),
  ('Fire separation wall — garage to living','STD',true,NULL,6)
) AS v(label, item_type, default_on, required_feature, display_order) WHERE s.slug = 'garage';

-- Basement
INSERT INTO public.scope_items (section_id, label, item_type, default_on, required_feature, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.required_feature, v.display_order
FROM public.scope_sections s, (VALUES
  ('Basement framing','STD',true,NULL,1),
  ('Below-grade wall framing','STD',true,NULL,2),
  ('Egress window wells','OPT',false,NULL,3),
  ('Walk-out basement framing','OPT',false,'basement_type_walk_out',4),
  ('Finished basement framing','OPT',false,'basement_type_full_finished',5)
) AS v(label, item_type, default_on, required_feature, display_order) WHERE s.slug = 'basement';

-- Stairs
INSERT INTO public.scope_items (section_id, label, item_type, default_on, required_feature, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.required_feature, v.display_order
FROM public.scope_sections s, (VALUES
  ('Interior wood stairs','OPT',false,'stair_types_interior_wood',1),
  ('Interior steel stairs','OPT',false,'stair_types_interior_steel',2),
  ('Exterior egress concrete stairs','OPT',false,'stair_types_exterior_egress_concrete',3),
  ('Exterior egress wood stairs','OPT',false,'stair_types_exterior_egress_wood',4),
  ('Common corridor stairs','OPT',false,'stair_types_common_corridor',5),
  ('Balcony / deck stairs','OPT',false,'stair_types_balcony_deck',6),
  ('Stair blocking and backing','STD',true,NULL,7),
  ('Handrail blocking','STD',true,NULL,8)
) AS v(label, item_type, default_on, required_feature, display_order) WHERE s.slug = 'stairs';

-- Pool
INSERT INTO public.scope_items (section_id, label, item_type, default_on, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.display_order
FROM public.scope_sections s, (VALUES
  ('Pool equipment room framing','STD',true,1),
  ('Pool deck framing','STD',true,2),
  ('Pool house or cabana framing','OPT',false,3)
) AS v(label, item_type, default_on, display_order) WHERE s.slug = 'pool';

-- Elevator shaft
INSERT INTO public.scope_items (section_id, label, item_type, default_on, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.display_order
FROM public.scope_sections s, (VALUES
  ('Elevator shaft framing','STD',true,1),
  ('Shaft blocking and backing','STD',true,2),
  ('Machine room framing','OPT',false,3)
) AS v(label, item_type, default_on, display_order) WHERE s.slug = 'elevator_shaft';

-- Clubhouse / amenity
INSERT INTO public.scope_items (section_id, label, item_type, default_on, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.display_order
FROM public.scope_sections s, (VALUES
  ('Clubhouse framing','STD',true,1),
  ('Clubhouse roof system','STD',true,2),
  ('Exterior cladding and siding','STD',true,3),
  ('Windows and doors','STD',true,4),
  ('Amenity room framing','OPT',false,5)
) AS v(label, item_type, default_on, display_order) WHERE s.slug = 'clubhouse_amenity';

-- Commercial spaces
INSERT INTO public.scope_items (section_id, label, item_type, default_on, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.display_order
FROM public.scope_sections s, (VALUES
  ('Ground-floor commercial framing','STD',true,1),
  ('Storefront rough openings','STD',true,2),
  ('Commercial restroom framing','STD',true,3),
  ('Mezzanine framing','OPT',false,4)
) AS v(label, item_type, default_on, display_order) WHERE s.slug = 'commercial_spaces';

-- Shed / outbuilding
INSERT INTO public.scope_items (section_id, label, item_type, default_on, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.display_order
FROM public.scope_sections s, (VALUES
  ('Shed framing','STD',true,1),
  ('Shed roof system','STD',true,2),
  ('Shed doors','STD',true,3)
) AS v(label, item_type, default_on, display_order) WHERE s.slug = 'shed_outbuilding';

-- Hardware & backout
INSERT INTO public.scope_items (section_id, label, item_type, default_on, display_order)
SELECT s.id, v.label, v.item_type, v.default_on, v.display_order
FROM public.scope_sections s, (VALUES
  ('Holdowns, straps, hangers, post caps, angles','STD',true,1),
  ('Stud replacement after MEP pulls','STD',true,2),
  ('Re-frame areas disturbed by other trades','STD',true,3),
  ('Add blocking missed during rough-in','STD',true,4),
  ('Punchlist completion','STD',true,5),
  ('Substantial completion inspection','STD',true,6)
) AS v(label, item_type, default_on, display_order) WHERE s.slug = 'hardware_backout';

-- ============================================================
-- 5. project_scope_selections
-- ============================================================
CREATE TABLE public.project_scope_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.project_profiles(id) ON DELETE CASCADE,
  scope_item_id uuid NOT NULL REFERENCES public.scope_items(id) ON DELETE CASCADE,
  is_on boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  is_conflict boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, scope_item_id)
);

ALTER TABLE public.project_scope_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project participants can view selections" ON public.project_scope_selections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_team pt
      WHERE pt.project_id = project_scope_selections.project_id
        AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY "Project creator can manage selections" ON public.project_scope_selections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_scope_selections.project_id
        AND p.organization_id IN (
          SELECT uor.organization_id FROM public.user_org_roles uor WHERE uor.user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_scope_selections.project_id
        AND p.organization_id IN (
          SELECT uor.organization_id FROM public.user_org_roles uor WHERE uor.user_id = auth.uid()
        )
    )
  );

-- Updated_at triggers
CREATE TRIGGER update_project_profiles_updated_at
  BEFORE UPDATE ON public.project_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_scope_selections_updated_at
  BEFORE UPDATE ON public.project_scope_selections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
