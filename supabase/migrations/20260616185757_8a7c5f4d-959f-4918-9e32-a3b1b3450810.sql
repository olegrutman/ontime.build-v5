
-- Phase 0: CO v4 foundations (additive, defaulted, no breaking changes)

-- 1. entry_source enum + column on change_orders
DO $$ BEGIN
  CREATE TYPE public.co_entry_source AS ENUM ('picker_v3','ai_intake','guided_v4','field_pn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS entry_source public.co_entry_source NOT NULL DEFAULT 'picker_v3',
  ADD COLUMN IF NOT EXISTS problem_summary text,
  ADD COLUMN IF NOT EXISTS problem_voice_url text,
  ADD COLUMN IF NOT EXISTS ai_intake_id uuid;

COMMENT ON COLUMN public.change_orders.entry_source IS
  'Which v4 entry surface created this CO. picker_v3 = legacy wizard (default).';
COMMENT ON COLUMN public.change_orders.ai_intake_id IS
  'FK to co_ai_intakes added in Phase 2. Nullable; unconstrained here to keep migration order flexible.';

-- 2. source + scenario/group tags on co_line_items
DO $$ BEGIN
  CREATE TYPE public.co_line_source AS ENUM ('manual','picker_v3','ai_split','guided_v4','scenario_library');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.co_line_items
  ADD COLUMN IF NOT EXISTS source public.co_line_source NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS scenario_id text,
  ADD COLUMN IF NOT EXISTS group_key text;

COMMENT ON COLUMN public.co_line_items.source IS
  'Which builder produced this line. Default manual matches all existing rows.';
COMMENT ON COLUMN public.co_line_items.group_key IS
  'Optional grouping key so one guided/AI line can fan out across multiple units while staying logically one item.';

-- 3. Org-scoped feature flag table for co_v4 (and any future v4 flags)
CREATE TABLE IF NOT EXISTS public.co_v4_feature_flags (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  flag          text NOT NULL,
  enabled       boolean NOT NULL DEFAULT false,
  enabled_at    timestamptz,
  enabled_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, flag)
);

GRANT SELECT ON public.co_v4_feature_flags TO authenticated;
GRANT ALL    ON public.co_v4_feature_flags TO service_role;

ALTER TABLE public.co_v4_feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone in the org can read their org's flags
CREATE POLICY "Org members read their CO v4 flags"
  ON public.co_v4_feature_flags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_org_roles uor
      WHERE uor.user_id = auth.uid()
        AND uor.organization_id = co_v4_feature_flags.org_id
    )
  );

-- Only platform staff (via service_role / edge functions) toggle flags initially.
-- No INSERT/UPDATE/DELETE policy for authenticated — locked to service_role on purpose.

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_co_v4_feature_flags()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_co_v4_feature_flags_touch ON public.co_v4_feature_flags;
CREATE TRIGGER trg_co_v4_feature_flags_touch
  BEFORE UPDATE ON public.co_v4_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.touch_co_v4_feature_flags();

-- Helper for client/edge gating
CREATE OR REPLACE FUNCTION public.has_co_v4_flag(_org_id uuid, _flag text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled
       FROM public.co_v4_feature_flags
      WHERE org_id = _org_id
        AND flag = _flag
      LIMIT 1),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_co_v4_flag(uuid, text) TO authenticated, service_role;
