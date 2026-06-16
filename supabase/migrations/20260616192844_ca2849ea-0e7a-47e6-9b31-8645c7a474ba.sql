
-- =========================================================================
-- Phase 2: AI Intake
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.co_ai_intakes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  source_kind     text NOT NULL CHECK (source_kind IN ('paste','voice')),
  raw_text        text,
  voice_url       text,
  model           text,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','succeeded','failed','finalized','discarded')),
  output_json     jsonb,
  error_message   text,
  finalized_co_id uuid REFERENCES public.change_orders(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_co_ai_intakes_project ON public.co_ai_intakes(project_id);
CREATE INDEX IF NOT EXISTS idx_co_ai_intakes_creator ON public.co_ai_intakes(created_by);

GRANT SELECT, INSERT, UPDATE ON public.co_ai_intakes TO authenticated;
GRANT ALL ON public.co_ai_intakes TO service_role;

ALTER TABLE public.co_ai_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can read own intakes"
  ON public.co_ai_intakes FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Project participants can read linked intakes"
  ON public.co_ai_intakes FOR SELECT TO authenticated
  USING (
    finalized_co_id IS NOT NULL
    AND public.is_project_participant(project_id, auth.uid())
  );

CREATE POLICY "Creator inserts own intake"
  ON public.co_ai_intakes FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_project_participant(project_id, auth.uid())
  );

CREATE POLICY "Creator updates own intake"
  ON public.co_ai_intakes FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Backfill FK from change_orders.ai_intake_id now that the target table exists
ALTER TABLE public.change_orders
  ADD CONSTRAINT change_orders_ai_intake_fk
  FOREIGN KEY (ai_intake_id) REFERENCES public.co_ai_intakes(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.touch_co_ai_intakes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_co_ai_intakes_touch ON public.co_ai_intakes;
CREATE TRIGGER trg_co_ai_intakes_touch
  BEFORE UPDATE ON public.co_ai_intakes
  FOR EACH ROW EXECUTE FUNCTION public.touch_co_ai_intakes();

-- =========================================================================
-- Phase 4: Scenario Library
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.co_scenarios (
  id                   text PRIMARY KEY,
  name                 text NOT NULL,
  description          text,
  project_types        text[] NOT NULL DEFAULT '{}',
  problem_tags         text[] NOT NULL DEFAULT '{}',
  system_tag           text,
  default_unit         text,
  default_qty_formula  text,
  sort_order           int NOT NULL DEFAULT 0,
  is_platform          boolean NOT NULL DEFAULT true,
  org_id               uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.co_scenario_lines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id   text NOT NULL REFERENCES public.co_scenarios(id) ON DELETE CASCADE,
  line_no       int NOT NULL,
  catalog_slug  text,
  description   text NOT NULL,
  qty_expr      text,
  default_unit  text,
  role_hint     text CHECK (role_hint IN ('GC','TC','FC') OR role_hint IS NULL),
  notes         text,
  UNIQUE (scenario_id, line_no)
);

CREATE TABLE IF NOT EXISTS public.co_scenario_builder_map (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id         text NOT NULL REFERENCES public.co_scenarios(id) ON DELETE CASCADE,
  step_no             int NOT NULL,
  prompt              text NOT NULL,
  child_scenario_ids  text[] NOT NULL DEFAULT '{}',
  UNIQUE (scenario_id, step_no)
);

GRANT SELECT ON public.co_scenarios, public.co_scenario_lines, public.co_scenario_builder_map TO authenticated;
GRANT ALL ON public.co_scenarios, public.co_scenario_lines, public.co_scenario_builder_map TO service_role;

ALTER TABLE public.co_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_scenario_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_scenario_builder_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read scenarios"
  ON public.co_scenarios FOR SELECT TO authenticated
  USING (is_platform = true OR org_id IN (
    SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Authenticated read scenario lines"
  ON public.co_scenario_lines FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.co_scenarios s WHERE s.id = scenario_id
      AND (s.is_platform = true OR s.org_id IN (
        SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
      ))
  ));

CREATE POLICY "Authenticated read scenario builder map"
  ON public.co_scenario_builder_map FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.co_scenarios s WHERE s.id = scenario_id
      AND (s.is_platform = true OR s.org_id IN (
        SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
      ))
  ));

-- =========================================================================
-- Phase 5: Per-CO mini-SOV + per-contract rollup view
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.co_sov_lines (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_co_id             uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  source_co_line_item_id   uuid REFERENCES public.co_line_items(id) ON DELETE CASCADE,
  contract_id              uuid REFERENCES public.project_contracts(id) ON DELETE SET NULL,
  title                    text NOT NULL,
  scheduled_value          numeric(14,2) NOT NULL DEFAULT 0,
  billed_to_date           numeric(14,2) NOT NULL DEFAULT 0,
  retainage_pct            numeric(5,2)  NOT NULL DEFAULT 0,
  sort_order               int NOT NULL DEFAULT 0,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_co_id, source_co_line_item_id)
);

CREATE INDEX IF NOT EXISTS idx_co_sov_lines_project  ON public.co_sov_lines(project_id);
CREATE INDEX IF NOT EXISTS idx_co_sov_lines_contract ON public.co_sov_lines(contract_id);

GRANT SELECT ON public.co_sov_lines TO authenticated;
GRANT ALL    ON public.co_sov_lines TO service_role;

ALTER TABLE public.co_sov_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read CO SOV lines"
  ON public.co_sov_lines FOR SELECT TO authenticated
  USING (public.is_project_participant(project_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.co_sov_invoice_links (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  co_sov_line_id       uuid NOT NULL REFERENCES public.co_sov_lines(id) ON DELETE CASCADE,
  invoice_line_item_id uuid NOT NULL REFERENCES public.invoice_line_items(id) ON DELETE CASCADE,
  amount               numeric(14,2) NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (co_sov_line_id, invoice_line_item_id)
);

GRANT SELECT ON public.co_sov_invoice_links TO authenticated;
GRANT ALL    ON public.co_sov_invoice_links TO service_role;

ALTER TABLE public.co_sov_invoice_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read CO SOV invoice links"
  ON public.co_sov_invoice_links FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.co_sov_lines l
    WHERE l.id = co_sov_line_id
      AND public.is_project_participant(l.project_id, auth.uid())
  ));

-- Auto-mirror trigger: when CO is approved, materialize its line items into co_sov_lines.
-- Idempotent via the UNIQUE constraint + ON CONFLICT.
CREATE OR REPLACE FUNCTION public.sync_co_sov_lines()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id uuid;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Resolve a contract for this CO if one exists for the assigned TC org
    SELECT pc.id INTO v_contract_id
      FROM public.project_contracts pc
      WHERE pc.project_id = NEW.project_id
      LIMIT 1;

    INSERT INTO public.co_sov_lines (
      project_id, source_co_id, source_co_line_item_id, contract_id,
      title, scheduled_value, sort_order
    )
    SELECT
      NEW.project_id,
      NEW.id,
      li.id,
      v_contract_id,
      COALESCE(NULLIF(li.item_name, ''), 'CO line'),
      0, -- value populated by client/edge from billable totals; trigger keeps it zero-safe
      li.sort_order
    FROM public.co_line_items li
    WHERE li.co_id = NEW.id
    ON CONFLICT (source_co_id, source_co_line_item_id) DO NOTHING;

  ELSIF OLD.status = 'approved' AND NEW.status IS DISTINCT FROM 'approved' THEN
    DELETE FROM public.co_sov_lines WHERE source_co_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_co_sov_lines ON public.change_orders;
CREATE TRIGGER trg_sync_co_sov_lines
  AFTER UPDATE OF status ON public.change_orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_co_sov_lines();

-- Per-contract rollup view (read-only, security_invoker so RLS on base tables applies)
CREATE OR REPLACE VIEW public.co_sov_contract_rollup
WITH (security_invoker = on) AS
  SELECT
    l.project_id,
    l.contract_id,
    COUNT(*)                                   AS line_count,
    COUNT(DISTINCT l.source_co_id)             AS approved_co_count,
    COALESCE(SUM(l.scheduled_value), 0)        AS total_scheduled_value,
    COALESCE(SUM(l.billed_to_date), 0)         AS total_billed_to_date,
    COALESCE(SUM(l.scheduled_value - l.billed_to_date), 0) AS total_remaining
  FROM public.co_sov_lines l
  GROUP BY l.project_id, l.contract_id;

GRANT SELECT ON public.co_sov_contract_rollup TO authenticated;

-- updated_at trigger for co_sov_lines
CREATE OR REPLACE FUNCTION public.touch_co_sov_lines()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_co_sov_lines_touch ON public.co_sov_lines;
CREATE TRIGGER trg_co_sov_lines_touch
  BEFORE UPDATE ON public.co_sov_lines
  FOR EACH ROW EXECUTE FUNCTION public.touch_co_sov_lines();
