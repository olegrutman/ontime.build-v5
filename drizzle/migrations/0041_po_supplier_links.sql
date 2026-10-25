CREATE TABLE public.po_supplier_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  email text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  submitted_at timestamptz,
  submitted_count integer NOT NULL DEFAULT 0,
  submitter_name text
);
CREATE INDEX po_supplier_links_po_idx ON public.po_supplier_links(po_id);
GRANT ALL ON public.po_supplier_links TO service_role;
ALTER TABLE public.po_supplier_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_line_items ADD COLUMN IF NOT EXISTS is_unavailable boolean NOT NULL DEFAULT false;