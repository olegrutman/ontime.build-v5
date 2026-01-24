
-- ============================================
-- SOV Templates System
-- ============================================

-- Table: sov_templates (stores template definitions)
CREATE TABLE public.sov_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  generator_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: project_sov (links a project to a generated SOV)
CREATE TABLE public.project_sov (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  created_from_template_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: project_sov_items (individual SOV line items)
CREATE TABLE public.project_sov_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  item_name TEXT NOT NULL,
  item_group TEXT,
  default_enabled BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'template' CHECK (source IN ('template', 'user')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sov_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_sov ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_sov_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sov_templates (public read access)
CREATE POLICY "Anyone can view SOV templates"
ON public.sov_templates FOR SELECT
USING (true);

-- RLS Policies for project_sov
CREATE POLICY "Project members can view project SOV"
ON public.project_sov FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_sov.project_id
    AND (p.created_by = auth.uid() OR user_in_org(auth.uid(), p.organization_id))
  )
  OR EXISTS (
    SELECT 1 FROM project_participants pp
    WHERE pp.project_id = project_sov.project_id
    AND user_in_org(auth.uid(), pp.organization_id)
  )
);

CREATE POLICY "Project members can create project SOV"
ON public.project_sov FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_sov.project_id
    AND (p.created_by = auth.uid() OR user_in_org(auth.uid(), p.organization_id))
  )
  OR EXISTS (
    SELECT 1 FROM project_participants pp
    WHERE pp.project_id = project_sov.project_id
    AND user_in_org(auth.uid(), pp.organization_id)
  )
);

CREATE POLICY "Project members can delete project SOV"
ON public.project_sov FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_sov.project_id
    AND (p.created_by = auth.uid() OR user_in_org(auth.uid(), p.organization_id))
  )
);

-- RLS Policies for project_sov_items
CREATE POLICY "Project members can view SOV items"
ON public.project_sov_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_sov_items.project_id
    AND (p.created_by = auth.uid() OR user_in_org(auth.uid(), p.organization_id))
  )
  OR EXISTS (
    SELECT 1 FROM project_participants pp
    WHERE pp.project_id = project_sov_items.project_id
    AND user_in_org(auth.uid(), pp.organization_id)
  )
);

CREATE POLICY "Project members can insert SOV items"
ON public.project_sov_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_sov_items.project_id
    AND (p.created_by = auth.uid() OR user_in_org(auth.uid(), p.organization_id))
  )
  OR EXISTS (
    SELECT 1 FROM project_participants pp
    WHERE pp.project_id = project_sov_items.project_id
    AND user_in_org(auth.uid(), pp.organization_id)
  )
);

CREATE POLICY "Project members can update SOV items"
ON public.project_sov_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_sov_items.project_id
    AND (p.created_by = auth.uid() OR user_in_org(auth.uid(), p.organization_id))
  )
  OR EXISTS (
    SELECT 1 FROM project_participants pp
    WHERE pp.project_id = project_sov_items.project_id
    AND user_in_org(auth.uid(), pp.organization_id)
  )
);

CREATE POLICY "Project members can delete SOV items"
ON public.project_sov_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_sov_items.project_id
    AND (p.created_by = auth.uid() OR user_in_org(auth.uid(), p.organization_id))
  )
  OR EXISTS (
    SELECT 1 FROM project_participants pp
    WHERE pp.project_id = project_sov_items.project_id
    AND user_in_org(auth.uid(), pp.organization_id)
  )
);

-- Create index for faster lookups
CREATE INDEX idx_project_sov_items_project ON public.project_sov_items(project_id);
CREATE INDEX idx_project_sov_items_sort ON public.project_sov_items(project_id, sort_order);

-- ============================================
-- SEED SOV TEMPLATES
-- ============================================

INSERT INTO public.sov_templates (template_key, display_name, description, generator_rules) VALUES

-- TRACK_HOME Template
('TRACK_HOME', 'Track Home', 'Standard template for production/tract home construction', '{
  "type": "static_list",
  "items": [
    "Mobilization",
    "Basement Walls",
    "First Sub-floor",
    "Main Level Walls",
    "Main Level Walls Sheeting",
    "Second Sub-Floor",
    "Second Floor Walls",
    "Second Floor Walls Sheeting",
    "Trusses",
    "Truss Sheeting",
    "Main Level Backout",
    "Second Floor Backout",
    "Fascia and Soffit",
    "Decorative Elements",
    "Windows Installation",
    "Patio Doors Installation",
    "Siding",
    "Final Punch"
  ]
}'::jsonb),

-- CUSTOM_HOME Template
('CUSTOM_HOME', 'Custom Home', 'Template for custom/luxury home construction', '{
  "type": "static_list",
  "items": [
    "Mobilization",
    "Basement Walls",
    "First Sub-floor",
    "Main Level Walls",
    "Main Level Walls Sheeting",
    "Second Sub-Floor",
    "Second Floor Walls",
    "Second Floor Walls Sheeting",
    "Trusses",
    "Truss Sheeting",
    "Main Level Backout",
    "Second Floor Backout",
    "Fascia and Soffit",
    "Decorative Elements",
    "Windows Installation",
    "Patio Doors Installation",
    "Siding",
    "Decks",
    "Final Punch"
  ]
}'::jsonb),

-- TOWNHOME Template
('TOWNHOME', 'Townhome', 'Template for townhome construction', '{
  "type": "static_list",
  "items": [
    "Basement Framing",
    "First Floor Walls",
    "Second Sub-Floor",
    "Second Floor Walls",
    "Third Floor",
    "Third Floor Walls",
    "Roof Trusses",
    "Roof Sheathing",
    "Parapet Walls / Roof Access",
    "Hardware Installation",
    "First Floor Backout",
    "Second Floor Backout",
    "Third Floor Backout",
    "Shim and Shave",
    "Rough Inspection Completed",
    "Fascia and Soffit",
    "Tyvek",
    "Siding Front",
    "Siding Back",
    "Siding Side #1",
    "Siding Side #2",
    "Decks",
    "Final Punch"
  ]
}'::jsonb),

-- DUPLEX Template
('DUPLEX', 'Duplex', 'Template for duplex construction', '{
  "type": "static_list",
  "items": [
    "Basement Framing",
    "First Floor Walls",
    "Second Sub-Floor",
    "Second Floor Walls",
    "Third Floor",
    "Third Floor Walls",
    "Roof Trusses",
    "Roof Sheathing",
    "Parapet Walls / Roof Access",
    "Hardware Installation",
    "First Floor Backout",
    "Second Floor Backout",
    "Third Floor Backout",
    "Shim and Shave",
    "Rough Inspection Completed",
    "Fascia and Soffit",
    "Tyvek",
    "Siding Front",
    "Siding Back",
    "Siding Side #1",
    "Siding Side #2",
    "Decks",
    "Final Punch"
  ]
}'::jsonb),

-- APARTMENT_CONDO Template (story-based generator)
('APARTMENT_CONDO', 'Apartments/Condos', 'Dynamic template for multi-story apartments and condominiums', '{
  "type": "story_generator",
  "defaults": {
    "include_windows": true,
    "include_wrb": true,
    "include_siding_sides": ["Front", "Back", "Left", "Right"],
    "include_per_floor_inspection": true,
    "include_per_floor_final_punch": true
  },
  "story_patterns": {
    "level_1": [
      "{L} Floor Walls Frame",
      "{L} Floor Wall Sheathing"
    ],
    "levels_2_to_n": [
      "{L} Floor Trusses",
      "{L} Floor Truss Sheathing",
      "{L} Floor Walls Frame",
      "{L} Floor Wall Sheathing"
    ],
    "roof": [
      "Roof Trusses",
      "Roof Truss Sheathing"
    ],
    "per_level_closeout": [
      "{L} Floor Hardware Installation",
      "{L} Floor Backout/ Blocking",
      "{L} Floor Shim and Shave"
    ],
    "global_exterior": [
      "Windows Install",
      "Tyvek Install",
      "Siding Front",
      "Siding Back",
      "Siding Left Side",
      "Siding Right Side"
    ],
    "per_level_inspections": [
      "{L} Floor Inspection"
    ],
    "per_level_final_punch": [
      "{L} Floor Final Punch"
    ]
  }
}'::jsonb),

-- HOTEL Template (inherits from APARTMENT_CONDO)
('HOTEL', 'Hotel', 'Template for hotel construction (based on Apartments/Condos with additions)', '{
  "type": "inherit",
  "inherit_from": "APARTMENT_CONDO",
  "add_items_end": [
    "Pool Room"
  ]
}'::jsonb);
