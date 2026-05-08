-- Add applicable_systems column for per-system scope filtering
ALTER TABLE public.catalog_definitions
  ADD COLUMN IF NOT EXISTS applicable_systems text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_catalog_definitions_applicable_systems
  ON public.catalog_definitions USING GIN (applicable_systems);

-- Backfill existing 122 catalog items based on division + category
-- Generic buckets: apply to all 9 systems
UPDATE public.catalog_definitions
SET applicable_systems = ARRAY['floor','wall','roof','ceiling','exterior','openings','deck','stair','other']
WHERE deprecated_at IS NULL AND (
  (division = 'demo'    AND category = 'selective_demo') OR
  (division = 'fix'     AND category = 'corrections')    OR
  (division = 'general' AND category = 'misc')
);

-- Framing
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['floor']                  WHERE deprecated_at IS NULL AND division='framing' AND category='floors';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['wall']                   WHERE deprecated_at IS NULL AND division='framing' AND category='walls';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['ceiling']                WHERE deprecated_at IS NULL AND division='framing' AND category='soffits';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['openings']               WHERE deprecated_at IS NULL AND division='framing' AND category='openings';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['stair']                  WHERE deprecated_at IS NULL AND division='framing' AND category='stairs';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['wall','floor','ceiling'] WHERE deprecated_at IS NULL AND division='framing' AND category='blocking';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['wall']                   WHERE deprecated_at IS NULL AND division='framing' AND category='enclosures';

-- Sheathing
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['wall','floor','roof']    WHERE deprecated_at IS NULL AND division='sheathing' AND category='general';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['wall']                   WHERE deprecated_at IS NULL AND division='sheathing' AND category='shear_structural';

-- Structural
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['floor','ceiling','roof']         WHERE deprecated_at IS NULL AND division='structural' AND category='beams';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['floor','wall']                   WHERE deprecated_at IS NULL AND division='structural' AND category='columns';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['floor','wall','roof','ceiling']  WHERE deprecated_at IS NULL AND division='structural' AND category='connectors';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['wall']                           WHERE deprecated_at IS NULL AND division='structural' AND category='shear_lateral';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['floor','wall','roof','ceiling']  WHERE deprecated_at IS NULL AND division='structural' AND category='repair';

-- Envelope exterior
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['exterior'] WHERE deprecated_at IS NULL AND division='envelope_exterior' AND category='siding_trim';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['deck']     WHERE deprecated_at IS NULL AND division='envelope_exterior' AND category='deck_pergola_fence';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['exterior'] WHERE deprecated_at IS NULL AND division='envelope_exterior' AND category='other';

-- Envelope WRB
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['exterior','roof']            WHERE deprecated_at IS NULL AND division='envelope_wrb' AND category='membrane';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['exterior','roof','openings'] WHERE deprecated_at IS NULL AND division='envelope_wrb' AND category='flashing';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['openings']                   WHERE deprecated_at IS NULL AND division='envelope_wrb' AND category='openings';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['exterior','wall','roof']     WHERE deprecated_at IS NULL AND division='envelope_wrb' AND category='inspection';

-- Interior finish
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['wall']            WHERE deprecated_at IS NULL AND division='interior_finish' AND category='wall_finish';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['ceiling']         WHERE deprecated_at IS NULL AND division='interior_finish' AND category='ceiling_finish';
UPDATE public.catalog_definitions SET applicable_systems = ARRAY['wall','ceiling']  WHERE deprecated_at IS NULL AND division='interior_finish' AND category='prep';