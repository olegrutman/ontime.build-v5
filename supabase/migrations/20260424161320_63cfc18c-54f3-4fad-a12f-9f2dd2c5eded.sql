-- ===========================================================
-- Phase 1: catalog_definitions — new source of truth for the
-- CO/WO scope picker. Replaces hardcoded SCOPE_CATALOG and
-- coexists with legacy work_order_catalog (untouched).
-- ===========================================================

CREATE TABLE IF NOT EXISTS public.catalog_definitions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                     text NOT NULL UNIQUE,
  kind                     text NOT NULL DEFAULT 'scope',
  is_platform              boolean NOT NULL DEFAULT true,
  org_id                   uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  canonical_name           text NOT NULL,
  division                 text NOT NULL,
  category                 text NOT NULL,
  unit                     text NOT NULL,
  tag                      text,
  applicable_zone          text,
  applicable_work_types    text[] NOT NULL DEFAULT '{}',
  applicable_reasons       text[] NOT NULL DEFAULT '{}',
  search_text              text,
  aliases                  text[] NOT NULL DEFAULT '{}',
  sort_order               integer DEFAULT 0,
  deprecated_at            timestamptz,
  superseded_by            uuid REFERENCES public.catalog_definitions(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cd_zone ON public.catalog_definitions(applicable_zone);
CREATE INDEX IF NOT EXISTS idx_cd_wt   ON public.catalog_definitions USING gin(applicable_work_types);
CREATE INDEX IF NOT EXISTS idx_cd_rsn  ON public.catalog_definitions USING gin(applicable_reasons);
CREATE INDEX IF NOT EXISTS idx_cd_org  ON public.catalog_definitions(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cd_slug ON public.catalog_definitions(slug);

ALTER TABLE public.catalog_definitions ENABLE ROW LEVEL SECURITY;

-- Platform rows: visible to any signed-in user
DROP POLICY IF EXISTS "Platform catalog readable by authenticated"
  ON public.catalog_definitions;
CREATE POLICY "Platform catalog readable by authenticated"
  ON public.catalog_definitions FOR SELECT
  TO authenticated
  USING (is_platform = true AND org_id IS NULL);

-- Org-scoped rows: visible only to members of that org
DROP POLICY IF EXISTS "Org catalog readable by members"
  ON public.catalog_definitions;
CREATE POLICY "Org catalog readable by members"
  ON public.catalog_definitions FOR SELECT
  TO authenticated
  USING (
    org_id IS NOT NULL
    AND org_id IN (
      SELECT organization_id
      FROM public.user_org_roles
      WHERE user_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies in Phase 1: per-org editing UI is deferred.
-- Platform seeding runs via the insert tool with service-role privileges.