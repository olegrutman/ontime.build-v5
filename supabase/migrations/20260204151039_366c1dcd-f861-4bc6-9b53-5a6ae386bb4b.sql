-- Add new attribute columns for the inventory file
ALTER TABLE catalog_items
ADD COLUMN IF NOT EXISTS edge_type text,
ADD COLUMN IF NOT EXISTS depth text,
ADD COLUMN IF NOT EXISTS width text,
ADD COLUMN IF NOT EXISTS diameter text,
ADD COLUMN IF NOT EXISTS length_unit text,
ADD COLUMN IF NOT EXISTS length_increment numeric;

-- Create composite index for category filtering
CREATE INDEX IF NOT EXISTS idx_catalog_main_secondary 
ON catalog_items(category, secondary_category);

-- Create index on use_type and product_type for the new filter flow
CREATE INDEX IF NOT EXISTS idx_catalog_use_type ON catalog_items(use_type);
CREATE INDEX IF NOT EXISTS idx_catalog_product_type ON catalog_items(product_type);