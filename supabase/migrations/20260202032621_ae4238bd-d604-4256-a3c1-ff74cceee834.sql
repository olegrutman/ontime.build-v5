-- Fix function search_path for update_catalog_search_vector
CREATE OR REPLACE FUNCTION update_catalog_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.supplier_sku, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.secondary_category, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.manufacturer, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.dimension, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.thickness, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.color, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.wood_species, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(COALESCE(NEW.search_keywords, '{}'), ' ')), 'D');
  RETURN NEW;
END;
$$;

-- Fix function search_path for search_catalog_v2
DROP FUNCTION IF EXISTS search_catalog_v2(TEXT, TEXT, TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION search_catalog_v2(
  search_query TEXT DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  secondary_category_filter TEXT DEFAULT NULL,
  manufacturer_filter TEXT DEFAULT NULL,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
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
  uom_default TEXT,
  size_or_spec TEXT,
  bundle_type TEXT,
  bundle_qty INTEGER,
  wood_species TEXT,
  rank REAL
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id,
    ci.supplier_sku,
    ci.name,
    ci.description,
    ci.category::TEXT,
    ci.secondary_category,
    ci.manufacturer,
    ci.dimension,
    ci.thickness,
    ci.length,
    ci.color,
    ci.uom_default,
    ci.size_or_spec,
    ci.bundle_type,
    ci.bundle_qty,
    ci.wood_species,
    CASE 
      WHEN search_query IS NULL OR search_query = '' THEN 0::REAL
      ELSE ts_rank(ci.search_vector, websearch_to_tsquery('english', search_query))::REAL
    END AS rank
  FROM catalog_items ci
  WHERE 
    (search_query IS NULL OR search_query = '' OR
     ci.search_vector @@ websearch_to_tsquery('english', search_query) OR
     ci.supplier_sku ILIKE '%' || search_query || '%')
    AND (category_filter IS NULL OR category_filter = '' OR ci.category::TEXT = category_filter)
    AND (secondary_category_filter IS NULL OR secondary_category_filter = '' OR ci.secondary_category ILIKE '%' || secondary_category_filter || '%')
    AND (manufacturer_filter IS NULL OR manufacturer_filter = '' OR ci.manufacturer ILIKE '%' || manufacturer_filter || '%')
  ORDER BY 
    CASE WHEN search_query IS NOT NULL AND ci.supplier_sku ILIKE search_query THEN 0 ELSE 1 END,
    ts_rank(ci.search_vector, websearch_to_tsquery('english', COALESCE(search_query, ''))) DESC,
    ci.name NULLS LAST,
    ci.supplier_sku
  LIMIT max_results;
END;
$$;