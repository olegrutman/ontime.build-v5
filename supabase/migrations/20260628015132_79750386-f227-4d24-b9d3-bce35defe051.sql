
-- Add location-contract metadata to co_scenarios
ALTER TABLE public.co_scenarios
  ADD COLUMN IF NOT EXISTS component_lock text,        -- 'wall'|'roof_system'|'floor_system'|'ceiling_system'|'stairs'|'exterior_skin'|'opening'|'foundation'|null
  ADD COLUMN IF NOT EXISTS io_lock text,               -- 'inside'|'outside'|null
  ADD COLUMN IF NOT EXISTS level_constraint text NOT NULL DEFAULT 'any', -- 'any'|'top_only'|'ground_only'|'basement_only'|'foundation_only'|'exterior_face'|'stair_run'|'whole_building'
  ADD COLUMN IF NOT EXISTS area_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_fill_location boolean NOT NULL DEFAULT false;

-- Backfill from system_tag + name patterns. First-match wins.

-- Roof trusses → roof system, top level only, both inside/outside (working in attic + on roof plane), auto-fill
UPDATE public.co_scenarios SET
  component_lock = 'roof_system',
  io_lock = NULL,
  level_constraint = 'top_only',
  auto_fill_location = true
WHERE system_tag = 'Roof trusses';

-- Fascia / soffit → exterior skin, outside, top-only, auto-fill
UPDATE public.co_scenarios SET
  component_lock = 'exterior_skin',
  io_lock = 'outside',
  level_constraint = 'top_only',
  auto_fill_location = true
WHERE system_tag = 'Fascia / soffit';

-- Siding → exterior skin, outside, exterior face (all levels), elevation required
UPDATE public.co_scenarios SET
  component_lock = 'exterior_skin',
  io_lock = 'outside',
  level_constraint = 'exterior_face',
  area_required = true
WHERE system_tag = 'Siding';

-- Decorative woodwork → exterior skin, outside, exterior face
UPDATE public.co_scenarios SET
  component_lock = 'exterior_skin',
  io_lock = 'outside',
  level_constraint = 'exterior_face',
  area_required = true
WHERE system_tag = 'Decorative woodwork';

-- Windows / patio doors → opening (both faces of wall), exterior face by level
UPDATE public.co_scenarios SET
  component_lock = 'opening',
  io_lock = NULL,
  level_constraint = 'exterior_face',
  area_required = true
WHERE system_tag = 'Windows / patio doors';

-- Balcony / deck → exterior, exterior face, level required
UPDATE public.co_scenarios SET
  component_lock = NULL,            -- balconies can be at any face/level; let user pick
  io_lock = 'outside',
  level_constraint = 'exterior_face',
  area_required = true
WHERE system_tag = 'Balcony / deck';

-- Stairs → stair run picker
UPDATE public.co_scenarios SET
  component_lock = 'stairs',
  io_lock = 'inside',
  level_constraint = 'stair_run',
  area_required = false
WHERE system_tag = 'Stairs';

-- Drop ceiling → ceiling system, inside, any level + room required
UPDATE public.co_scenarios SET
  component_lock = 'ceiling_system',
  io_lock = 'inside',
  level_constraint = 'any',
  area_required = true
WHERE system_tag = 'Drop ceiling';

-- Floor / ceiling system → floor system, inside, any level + room helpful
UPDATE public.co_scenarios SET
  component_lock = 'floor_system',
  io_lock = 'inside',
  level_constraint = 'any',
  area_required = false
WHERE system_tag = 'Floor / ceiling system';

-- Walls → ambiguous: user picks component (most are interior, but the
-- "Building height over zoning" one touches roof too — leave open)
UPDATE public.co_scenarios SET
  component_lock = 'wall',
  io_lock = 'inside',
  level_constraint = 'any',
  area_required = true
WHERE system_tag = 'Walls';

-- The "Building height over zoning — re-truss & cut walls" special case
-- spans walls + roof. Unlock component, force top level.
UPDATE public.co_scenarios SET
  component_lock = NULL,
  io_lock = NULL,
  level_constraint = 'top_only',
  area_required = false
WHERE name ILIKE 'Building height over zoning%';

-- Hardware / steel → ambiguous component, any level, room helpful
UPDATE public.co_scenarios SET
  component_lock = NULL,
  io_lock = 'inside',
  level_constraint = 'any',
  area_required = false
WHERE system_tag = 'Hardware / steel';
