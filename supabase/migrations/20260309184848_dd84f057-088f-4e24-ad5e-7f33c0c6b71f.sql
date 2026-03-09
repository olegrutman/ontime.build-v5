
-- Table: actual_cost_entries
CREATE TABLE public.actual_cost_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id uuid NOT NULL REFERENCES public.change_order_projects(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  cost_type text NOT NULL DEFAULT 'hours',
  description text NOT NULL DEFAULT '',
  men_count integer,
  hours_per_man numeric,
  hourly_rate numeric,
  lump_amount numeric,
  total_amount numeric NOT NULL DEFAULT 0,
  entered_by uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_actual_cost_entries_co ON public.actual_cost_entries(change_order_id);
CREATE INDEX idx_actual_cost_entries_org ON public.actual_cost_entries(organization_id);

-- RLS: private to the organization that created the entry
ALTER TABLE public.actual_cost_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org actual costs"
  ON public.actual_cost_entries FOR SELECT
  TO authenticated
  USING (user_in_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert own org actual costs"
  ON public.actual_cost_entries FOR INSERT
  TO authenticated
  WITH CHECK (user_in_org(auth.uid(), organization_id));

CREATE POLICY "Users can update own org actual costs"
  ON public.actual_cost_entries FOR UPDATE
  TO authenticated
  USING (user_in_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete own org actual costs"
  ON public.actual_cost_entries FOR DELETE
  TO authenticated
  USING (user_in_org(auth.uid(), organization_id));
