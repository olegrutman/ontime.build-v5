
-- Add columns to project_sov
ALTER TABLE public.project_sov
  ADD COLUMN IF NOT EXISTS project_profile_id uuid REFERENCES public.project_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scope_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS previous_version_id uuid REFERENCES public.project_sov(id) ON DELETE SET NULL;

-- Add columns to project_sov_items
ALTER TABLE public.project_sov_items
  ADD COLUMN IF NOT EXISTS scope_section_slug text,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_original_pct numeric,
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'unbilled',
  ADD COLUMN IF NOT EXISTS remaining_amount numeric(12,2) NOT NULL DEFAULT 0;

-- Create sov_invoice_lines table
CREATE TABLE IF NOT EXISTS public.sov_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sov_item_id uuid NOT NULL REFERENCES public.project_sov_items(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount_billed numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sov_invoice_lines ENABLE ROW LEVEL SECURITY;

-- RLS for sov_invoice_lines: project team members can SELECT
CREATE POLICY "Project team can view sov invoice lines" ON public.sov_invoice_lines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_sov_items psi
      JOIN project_sov ps ON ps.id = psi.sov_id
      JOIN project_team pt ON pt.project_id = ps.project_id
      WHERE psi.id = sov_invoice_lines.sov_item_id
        AND pt.user_id = auth.uid()
        AND pt.status = 'Accepted'
    )
  );

-- Project team can manage sov invoice lines
CREATE POLICY "Project team can manage sov invoice lines" ON public.sov_invoice_lines
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_sov_items psi
      JOIN project_sov ps ON ps.id = psi.sov_id
      JOIN project_team pt ON pt.project_id = ps.project_id
      WHERE psi.id = sov_invoice_lines.sov_item_id
        AND pt.user_id = auth.uid()
        AND pt.status = 'Accepted'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_sov_items psi
      JOIN project_sov ps ON ps.id = psi.sov_id
      JOIN project_team pt ON pt.project_id = ps.project_id
      WHERE psi.id = sov_invoice_lines.sov_item_id
        AND pt.user_id = auth.uid()
        AND pt.status = 'Accepted'
    )
  );

-- Update project_sov RLS to use project_team instead of org
DROP POLICY IF EXISTS "Users can view their org SOVs" ON public.project_sov;
DROP POLICY IF EXISTS "Users can manage their org SOVs" ON public.project_sov;

CREATE POLICY "Project team can view SOVs" ON public.project_sov
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_team pt
      WHERE pt.project_id = project_sov.project_id
        AND pt.user_id = auth.uid()
        AND pt.status = 'Accepted'
    )
  );

CREATE POLICY "Project team can manage SOVs" ON public.project_sov
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_team pt
      WHERE pt.project_id = project_sov.project_id
        AND pt.user_id = auth.uid()
        AND pt.status = 'Accepted'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_team pt
      WHERE pt.project_id = project_sov.project_id
        AND pt.user_id = auth.uid()
        AND pt.status = 'Accepted'
    )
  );

-- Update project_sov_items RLS similarly
DROP POLICY IF EXISTS "Users can view their org SOV items" ON public.project_sov_items;
DROP POLICY IF EXISTS "Users can manage their org SOV items" ON public.project_sov_items;

CREATE POLICY "Project team can view SOV items" ON public.project_sov_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_team pt
      WHERE pt.project_id = project_sov_items.project_id
        AND pt.user_id = auth.uid()
        AND pt.status = 'Accepted'
    )
  );

CREATE POLICY "Project team can manage SOV items" ON public.project_sov_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_team pt
      WHERE pt.project_id = project_sov_items.project_id
        AND pt.user_id = auth.uid()
        AND pt.status = 'Accepted'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_team pt
      WHERE pt.project_id = project_sov_items.project_id
        AND pt.user_id = auth.uid()
        AND pt.status = 'Accepted'
    )
  );
