-- Category/secondary counts should only include active products;
-- retired rows were inflating the picker counts (e.g. old master-catalog items).
CREATE OR REPLACE FUNCTION public.catalog_facets(p_supplier_id uuid)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT category::TEXT AS category, secondary_category
    FROM public.catalog_items
    WHERE supplier_id = p_supplier_id
      AND is_active = true
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
$function$;