-- Add new category values to the catalog_category enum
ALTER TYPE public.catalog_category ADD VALUE IF NOT EXISTS 'FramingLumber';
ALTER TYPE public.catalog_category ADD VALUE IF NOT EXISTS 'Drywall';
ALTER TYPE public.catalog_category ADD VALUE IF NOT EXISTS 'FramingAccessories';