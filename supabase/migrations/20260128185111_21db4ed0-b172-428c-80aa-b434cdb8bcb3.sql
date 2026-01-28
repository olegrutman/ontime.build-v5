-- Add new categories to the catalog_category enum
ALTER TYPE catalog_category ADD VALUE IF NOT EXISTS 'Decking';
ALTER TYPE catalog_category ADD VALUE IF NOT EXISTS 'Exterior';
ALTER TYPE catalog_category ADD VALUE IF NOT EXISTS 'Interior';
ALTER TYPE catalog_category ADD VALUE IF NOT EXISTS 'Roofing';
ALTER TYPE catalog_category ADD VALUE IF NOT EXISTS 'Structural';
ALTER TYPE catalog_category ADD VALUE IF NOT EXISTS 'Adhesives';
ALTER TYPE catalog_category ADD VALUE IF NOT EXISTS 'Insulation';
ALTER TYPE catalog_category ADD VALUE IF NOT EXISTS 'Concrete';