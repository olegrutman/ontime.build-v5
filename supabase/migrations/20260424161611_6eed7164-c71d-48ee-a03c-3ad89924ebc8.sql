UPDATE public.catalog_definitions
SET deprecated_at = now(),
    superseded_by = (SELECT id FROM public.catalog_definitions WHERE slug = 'w19')
WHERE slug = 'd7';

UPDATE public.catalog_definitions
SET deprecated_at = now(),
    superseded_by = (SELECT id FROM public.catalog_definitions WHERE slug = 'w23')
WHERE slug = 'd8';