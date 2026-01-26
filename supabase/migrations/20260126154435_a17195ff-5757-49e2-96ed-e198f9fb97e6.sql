-- Fix search_path on normalize_phone function
CREATE OR REPLACE FUNCTION public.normalize_phone(phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g');
$$;