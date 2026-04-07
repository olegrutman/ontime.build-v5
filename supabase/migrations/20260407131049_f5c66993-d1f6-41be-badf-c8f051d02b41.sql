
-- Add contract lifecycle columns to project_contracts
ALTER TABLE public.project_contracts
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_note text,
  ADD COLUMN IF NOT EXISTS sow_status text DEFAULT 'none';

-- Set existing contracts with a contract_sum to 'accepted' status if status is null
UPDATE public.project_contracts
SET status = 'accepted'
WHERE contract_sum IS NOT NULL AND contract_sum > 0 AND (status IS NULL OR status = '');

-- Set remaining contracts to 'draft'
UPDATE public.project_contracts
SET status = 'draft'
WHERE status IS NULL OR status = '';

-- Create contract SOW items table
CREATE TABLE public.contract_sow_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.project_contracts(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  quantity numeric DEFAULT 1,
  unit text DEFAULT 'LS',
  unit_cost numeric DEFAULT 0,
  total numeric GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  item_type text NOT NULL DEFAULT 'work_item',
  sort_order integer NOT NULL DEFAULT 0,
  revision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_sow_items ENABLE ROW LEVEL SECURITY;

-- RLS: users can view SOW items if they're on the project
CREATE POLICY "Project members can view SOW items"
ON public.contract_sow_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_participants pp
    WHERE pp.project_id = contract_sow_items.project_id
      AND pp.organization_id IN (
        SELECT uor.organization_id FROM public.user_org_roles uor WHERE uor.user_id = auth.uid()
      )
  )
);

-- RLS: project members can insert SOW items
CREATE POLICY "Project members can insert SOW items"
ON public.contract_sow_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_participants pp
    WHERE pp.project_id = contract_sow_items.project_id
      AND pp.organization_id IN (
        SELECT uor.organization_id FROM public.user_org_roles uor WHERE uor.user_id = auth.uid()
      )
  )
);

-- RLS: project members can update SOW items
CREATE POLICY "Project members can update SOW items"
ON public.contract_sow_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_participants pp
    WHERE pp.project_id = contract_sow_items.project_id
      AND pp.organization_id IN (
        SELECT uor.organization_id FROM public.user_org_roles uor WHERE uor.user_id = auth.uid()
      )
  )
);

-- RLS: project members can delete SOW items
CREATE POLICY "Project members can delete SOW items"
ON public.contract_sow_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_participants pp
    WHERE pp.project_id = contract_sow_items.project_id
      AND pp.organization_id IN (
        SELECT uor.organization_id FROM public.user_org_roles uor WHERE uor.user_id = auth.uid()
      )
  )
);

-- Index for fast lookups
CREATE INDEX idx_contract_sow_items_contract ON public.contract_sow_items(contract_id);
CREATE INDEX idx_contract_sow_items_project ON public.contract_sow_items(project_id);

-- Trigger for updated_at
CREATE TRIGGER update_contract_sow_items_updated_at
  BEFORE UPDATE ON public.contract_sow_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
