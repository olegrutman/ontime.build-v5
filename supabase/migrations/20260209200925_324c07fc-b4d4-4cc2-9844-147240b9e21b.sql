
-- 1. Add pricing_mode to change_order_projects
ALTER TABLE public.change_order_projects
  ADD COLUMN pricing_mode text NOT NULL DEFAULT 'fixed';

-- 2. Create tm_time_cards table
CREATE TABLE public.tm_time_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  change_order_id uuid NOT NULL REFERENCES public.change_order_projects(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  -- FC fields
  fc_men_count integer,
  fc_hours_per_man numeric,
  fc_man_hours numeric GENERATED ALWAYS AS (COALESCE(fc_men_count, 0) * COALESCE(fc_hours_per_man, 0)) STORED,
  fc_description text,
  fc_entered_by uuid,
  fc_submitted_at timestamptz,
  -- TC fields
  tc_approved boolean NOT NULL DEFAULT false,
  tc_approved_by uuid,
  tc_approved_at timestamptz,
  tc_rejection_notes text,
  tc_own_hours numeric DEFAULT 0,
  tc_hourly_rate numeric,
  tc_submitted_at timestamptz,
  -- GC fields
  gc_acknowledged boolean NOT NULL DEFAULT false,
  gc_acknowledged_by uuid,
  gc_acknowledged_at timestamptz,
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_tm_time_cards_change_order ON public.tm_time_cards(change_order_id);
CREATE INDEX idx_tm_time_cards_entry_date ON public.tm_time_cards(change_order_id, entry_date);

-- Enable RLS
ALTER TABLE public.tm_time_cards ENABLE ROW LEVEL SECURITY;

-- RLS: All project team members can read time cards for their work orders
CREATE POLICY "Team members can view time cards"
  ON public.tm_time_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.change_order_projects cop
      JOIN public.project_team pt ON pt.project_id = cop.project_id
      WHERE cop.id = tm_time_cards.change_order_id
        AND pt.user_id = auth.uid()
    )
  );

-- RLS: FC and TC can insert time cards for their work orders
CREATE POLICY "Team members can create time cards"
  ON public.tm_time_cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.change_order_projects cop
      JOIN public.project_team pt ON pt.project_id = cop.project_id
      WHERE cop.id = tm_time_cards.change_order_id
        AND pt.user_id = auth.uid()
        AND pt.role IN ('Trade Contractor', 'Field Crew')
    )
  );

-- RLS: Team members can update time cards (field-level logic handled in app)
CREATE POLICY "Team members can update time cards"
  ON public.tm_time_cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.change_order_projects cop
      JOIN public.project_team pt ON pt.project_id = cop.project_id
      WHERE cop.id = tm_time_cards.change_order_id
        AND pt.user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_tm_time_cards_updated_at
  BEFORE UPDATE ON public.tm_time_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
