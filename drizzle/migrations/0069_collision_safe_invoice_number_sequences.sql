CREATE TABLE public.invoice_number_counters (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL,
  last_value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, prefix),
  CONSTRAINT invoice_number_counters_prefix_format CHECK (prefix ~ '^[A-Z0-9]{3}-[WC]?$'),
  CONSTRAINT invoice_number_counters_last_value_positive CHECK (last_value >= 0)
);

GRANT ALL ON public.invoice_number_counters TO service_role;

ALTER TABLE public.invoice_number_counters ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.invoice_number_counters IS 'Private atomic invoice-number allocations. Clients use next_invoice_sequence; no direct Data API access.';

CREATE OR REPLACE FUNCTION public.next_invoice_sequence(p_project_id UUID, p_prefix TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_see_project(p_project_id) THEN
    RAISE EXCEPTION 'Not authorized to allocate invoice numbers for this project' USING ERRCODE = '42501';
  END IF;

  IF p_prefix IS NULL OR p_prefix !~ '^[A-Z0-9]{3}-[WC]?$' THEN
    RAISE EXCEPTION 'Invalid invoice number prefix' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.invoice_number_counters (project_id, prefix, last_value)
  SELECT
    p_project_id,
    p_prefix,
    COALESCE(MAX((substring(i.invoice_number FROM char_length(p_prefix) + 1))::INTEGER), 0) + 1
  FROM public.invoices i
  WHERE i.project_id = p_project_id
    AND left(i.invoice_number, char_length(p_prefix)) = p_prefix
    AND substring(i.invoice_number FROM char_length(p_prefix) + 1) ~ '^[0-9]+$'
  ON CONFLICT (project_id, prefix) DO UPDATE
    SET last_value = GREATEST(
          invoice_number_counters.last_value,
          COALESCE((
            SELECT MAX((substring(i.invoice_number FROM char_length(p_prefix) + 1))::INTEGER)
            FROM public.invoices i
            WHERE i.project_id = p_project_id
              AND left(i.invoice_number, char_length(p_prefix)) = p_prefix
              AND substring(i.invoice_number FROM char_length(p_prefix) + 1) ~ '^[0-9]+$'
          ), 0)
        ) + 1,
        updated_at = now()
  RETURNING last_value INTO v_next;

  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION public.next_invoice_sequence(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_invoice_sequence(UUID, TEXT) TO authenticated, service_role;

COMMENT ON FUNCTION public.next_invoice_sequence(UUID, TEXT) IS 'Allocates a project/prefix sequence atomically across all billing companies after can_see_project authorization; gaps are allowed, duplicates are not.';