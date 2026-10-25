CREATE OR REPLACE FUNCTION public.search_catalog_v3(p_query text DEFAULT NULL::text, p_supplier_id uuid DEFAULT NULL::uuid, p_category text DEFAULT NULL::text, p_secondary text DEFAULT NULL::text, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, supplier_id uuid, supplier_sku text, name text, description text, category text, secondary_category text, manufacturer text, dimension text, thickness text, length text, color text, wood_species text, uom_default text, bundle_type text, bundle_qty integer, score real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND ci.is_active = true
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
$function$;