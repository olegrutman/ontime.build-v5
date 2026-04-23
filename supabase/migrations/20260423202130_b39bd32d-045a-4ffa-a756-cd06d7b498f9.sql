-- ==========================================================================
-- Product Picker cleanup migration
-- ==========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. NORMALIZE EXISTING DATA (idempotent)
UPDATE public.catalog_items
SET secondary_category = NULLIF(TRIM(secondary_category), '')
WHERE secondary_category IS DISTINCT FROM NULLIF(TRIM(secondary_category), '');

UPDATE public.catalog_items
SET manufacturer = NULLIF(UPPER(TRIM(manufacturer)), '')
WHERE manufacturer IS DISTINCT FROM NULLIF(UPPER(TRIM(manufacturer)), '');

UPDATE public.catalog_items SET secondary_category = 'T&G'        WHERE secondary_category IN ('T&G ', 'TONGUE & GROOVE');
UPDATE public.catalog_items SET secondary_category = 'SOFFIT'     WHERE secondary_category IN ('SOFFIT ', 'SOFFITS');
UPDATE public.catalog_items SET secondary_category = 'FASTENERS'  WHERE secondary_category IN (' FASTENERS ', 'FASTENER');
UPDATE public.catalog_items SET secondary_category = 'ADHESIVES'  WHERE secondary_category IN (' ADHESIVES ', 'ADHESIVE');

-- 3. NORMALIZED SEARCH COLUMN + TRIGGER
ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS normalized_search TEXT;

CREATE OR REPLACE FUNCTION public.compute_catalog_normalized_search(item_row public.catalog_items)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT LOWER(
    regexp_replace(
      concat_ws(' ',
        item_row.supplier_sku,
        item_row.name,
        item_row.description,
        item_row.secondary_category,
        item_row.manufacturer,
        item_row.dimension,
        item_row.length,
        item_row.thickness,
        item_row.color,
        item_row.wood_species,
        item_row.finish
      ),
      '(\d+(?:[-/]\d+)*)\s*(?:in\.?|")\s*(?:x\s*(\d+(?:[-/]\d+)*)\s*(?:in\.?|"))?|(\d+)\s*ft\.?',
      '\1x\2\3ft',
      'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.update_catalog_normalized_search()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.normalized_search := public.compute_catalog_normalized_search(NEW);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_catalog_items_normalized_search ON public.catalog_items;
CREATE TRIGGER trg_catalog_items_normalized_search
BEFORE INSERT OR UPDATE ON public.catalog_items
FOR EACH ROW EXECUTE FUNCTION public.update_catalog_normalized_search();

-- Backfill once
UPDATE public.catalog_items SET updated_at = now();

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_catalog_items_normalized_trgm
  ON public.catalog_items USING GIN (normalized_search gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_catalog_items_supp_cat_sec
  ON public.catalog_items (supplier_id, category, secondary_category);

CREATE INDEX IF NOT EXISTS idx_catalog_items_sku_upper
  ON public.catalog_items (UPPER(supplier_sku));

-- 5. FACET COUNTS RPC
CREATE OR REPLACE FUNCTION public.catalog_facets(p_supplier_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT category::TEXT AS category, secondary_category
    FROM public.catalog_items
    WHERE supplier_id = p_supplier_id
  ),
  cats AS (
    SELECT category, COUNT(*) AS n
    FROM base GROUP BY category
  ),
  secs AS (
    SELECT category, secondary_category, COUNT(*) AS n
    FROM base
    WHERE secondary_category IS NOT NULL
    GROUP BY category, secondary_category
  )
  SELECT json_build_object(
    'categories',  (SELECT COALESCE(json_agg(row_to_json(cats) ORDER BY n DESC), '[]'::json) FROM cats),
    'secondaries', (SELECT COALESCE(json_agg(row_to_json(secs) ORDER BY n DESC), '[]'::json) FROM secs)
  );
$$;

-- 6. SEARCH RPC (blended)
CREATE OR REPLACE FUNCTION public.search_catalog_v3(
  p_query TEXT DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_secondary TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  supplier_id UUID,
  supplier_sku TEXT,
  name TEXT,
  description TEXT,
  category TEXT,
  secondary_category TEXT,
  manufacturer TEXT,
  dimension TEXT,
  thickness TEXT,
  length TEXT,
  color TEXT,
  wood_species TEXT,
  uom_default TEXT,
  bundle_type TEXT,
  bundle_qty INTEGER,
  score REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q TEXT := NULLIF(TRIM(p_query), '');
BEGIN
  RETURN QUERY
  WITH scored AS (
    SELECT
      ci.*,
      CASE
        WHEN q IS NULL THEN 0
        WHEN UPPER(ci.supplier_sku) = UPPER(q) THEN 1000
        WHEN UPPER(ci.supplier_sku) LIKE UPPER(q) || '%' THEN 500
        ELSE 0
      END::REAL AS sku_score,
      CASE
        WHEN q IS NULL THEN 0
        ELSE COALESCE(ts_rank(ci.search_vector, websearch_to_tsquery('english', q)), 0) * 100
      END::REAL AS fts_score,
      CASE
        WHEN q IS NULL OR ci.normalized_search IS NULL THEN 0
        ELSE similarity(ci.normalized_search, LOWER(q)) * 50
      END::REAL AS trg_score
    FROM public.catalog_items ci
    WHERE (p_supplier_id IS NULL OR ci.supplier_id = p_supplier_id)
      AND (p_category    IS NULL OR ci.category::TEXT = p_category)
      AND (p_secondary   IS NULL OR ci.secondary_category = p_secondary)
      AND (
        q IS NULL
        OR ci.search_vector @@ websearch_to_tsquery('english', q)
        OR ci.normalized_search % LOWER(q)
        OR UPPER(ci.supplier_sku) LIKE UPPER(q) || '%'
      )
  )
  SELECT
    s.id, s.supplier_id, s.supplier_sku, s.name, s.description,
    s.category::TEXT, s.secondary_category, s.manufacturer,
    s.dimension, s.thickness, s.length, s.color, s.wood_species,
    s.uom_default, s.bundle_type, s.bundle_qty,
    (s.sku_score + s.fts_score + s.trg_score)::REAL AS score
  FROM scored s
  ORDER BY score DESC, s.name NULLS LAST, s.supplier_sku
  LIMIT p_limit;
END;
$$;

-- 7. RECENT ITEMS RPC
-- Joined via supplier_sku since po_line_items doesn't carry catalog_item_id.
CREATE OR REPLACE FUNCTION public.recent_catalog_items(
  p_supplier_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 90,
  p_limit INTEGER DEFAULT 12
)
RETURNS TABLE (
  id UUID,
  supplier_sku TEXT,
  name TEXT,
  description TEXT,
  category TEXT,
  secondary_category TEXT,
  dimension TEXT,
  length TEXT,
  uom_default TEXT,
  times_ordered INTEGER,
  last_ordered TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ci.id, ci.supplier_sku, ci.name, ci.description,
    ci.category::TEXT, ci.secondary_category,
    ci.dimension, ci.length, ci.uom_default,
    COUNT(*)::INTEGER AS times_ordered,
    MAX(po.created_at) AS last_ordered
  FROM public.po_line_items pli
  JOIN public.purchase_orders po ON po.id = pli.po_id
  JOIN public.catalog_items ci
    ON ci.supplier_id = po.supplier_id
   AND ci.supplier_sku = pli.supplier_sku
  WHERE po.supplier_id = p_supplier_id
    AND po.created_at > now() - (p_days || ' days')::INTERVAL
    AND (p_project_id IS NULL OR po.project_id = p_project_id)
    AND public.user_in_org(auth.uid(), po.organization_id)
  GROUP BY ci.id
  ORDER BY MAX(po.created_at) DESC, COUNT(*) DESC
  LIMIT p_limit;
$$;