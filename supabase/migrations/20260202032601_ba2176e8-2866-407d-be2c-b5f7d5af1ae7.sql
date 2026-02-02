-- Add new columns to catalog_items for enhanced product attributes
ALTER TABLE public.catalog_items
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS secondary_category TEXT,
ADD COLUMN IF NOT EXISTS manufacturer TEXT,
ADD COLUMN IF NOT EXISTS use_type TEXT,
ADD COLUMN IF NOT EXISTS product_type TEXT,
ADD COLUMN IF NOT EXISTS dimension TEXT,
ADD COLUMN IF NOT EXISTS thickness TEXT,
ADD COLUMN IF NOT EXISTS length TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS finish TEXT,
ADD COLUMN IF NOT EXISTS wood_species TEXT,
ADD COLUMN IF NOT EXISTS bundle_type TEXT,
ADD COLUMN IF NOT EXISTS bundle_qty INTEGER,
ADD COLUMN IF NOT EXISTS min_length NUMERIC,
ADD COLUMN IF NOT EXISTS max_length NUMERIC,
ADD COLUMN IF NOT EXISTS attributes JSONB;

-- Create indexes for common search fields
CREATE INDEX IF NOT EXISTS idx_catalog_items_secondary_category ON public.catalog_items(secondary_category);
CREATE INDEX IF NOT EXISTS idx_catalog_items_manufacturer ON public.catalog_items(manufacturer);
CREATE INDEX IF NOT EXISTS idx_catalog_items_name ON public.catalog_items(name);

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_catalog_search_vector_trigger ON public.catalog_items;

-- Create enhanced search vector trigger function
CREATE OR REPLACE FUNCTION update_catalog_search_vector()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for search vector updates
CREATE TRIGGER update_catalog_search_vector_trigger
BEFORE INSERT OR UPDATE ON public.catalog_items
FOR EACH ROW
EXECUTE FUNCTION update_catalog_search_vector();

-- Drop existing search function if exists
DROP FUNCTION IF EXISTS search_catalog_v2(TEXT, TEXT, TEXT, TEXT, INTEGER);

-- Create enhanced search function
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
) AS $$
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
    -- Exact SKU match first
    CASE WHEN search_query IS NOT NULL AND ci.supplier_sku ILIKE search_query THEN 0 ELSE 1 END,
    ts_rank(ci.search_vector, websearch_to_tsquery('english', COALESCE(search_query, ''))) DESC,
    ci.name NULLS LAST,
    ci.supplier_sku
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update existing rows to regenerate search vectors
UPDATE public.catalog_items SET updated_at = NOW();