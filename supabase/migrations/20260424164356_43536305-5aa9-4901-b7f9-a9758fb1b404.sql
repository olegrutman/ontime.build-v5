-- Phase 4a: AI provenance columns on co_line_items
ALTER TABLE public.co_line_items
  ADD COLUMN IF NOT EXISTS quantity_source text,
  ADD COLUMN IF NOT EXISTS ai_confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_reasoning text;

-- Phase 4b: Evidence table for scope picks (photos/captions/qa answers)
CREATE TABLE IF NOT EXISTS public.co_scope_evidence (
  id              uuid primary key default gen_random_uuid(),
  co_line_item_id uuid not null references public.co_line_items(id) ON DELETE CASCADE,
  co_id           uuid not null references public.change_orders(id) ON DELETE CASCADE,
  kind            text not null,
  photo_path      text,
  caption         text,
  ai_model        text,
  confidence      numeric,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_co_scope_evidence_line_item ON public.co_scope_evidence(co_line_item_id);
CREATE INDEX IF NOT EXISTS idx_co_scope_evidence_co       ON public.co_scope_evidence(co_id);

ALTER TABLE public.co_scope_evidence ENABLE ROW LEVEL SECURITY;

-- Mirror co_line_items RLS, joined through the parent CO
CREATE POLICY "Evidence readable by co participants"
  ON public.co_scope_evidence FOR SELECT
  TO authenticated
  USING (public.can_access_change_order(co_id));

CREATE POLICY "Evidence insertable by co owner org"
  ON public.co_scope_evidence FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.co_line_items li
      WHERE li.id = co_scope_evidence.co_line_item_id
        AND public.user_in_org(auth.uid(), li.org_id)
    )
  );

CREATE POLICY "Evidence deletable by co owner org"
  ON public.co_scope_evidence FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.co_line_items li
      WHERE li.id = co_scope_evidence.co_line_item_id
        AND li.org_id IN (
          SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
        )
    )
  );