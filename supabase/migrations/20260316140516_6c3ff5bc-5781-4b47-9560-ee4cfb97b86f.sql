
-- Migration 2: New column on project_team
ALTER TABLE public.project_team ADD COLUMN IF NOT EXISTS labor_rate DECIMAL;

-- Migration 3: New columns on organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS default_materials_markup_pct DECIMAL NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_equipment_markup_pct DECIMAL NOT NULL DEFAULT 0;
