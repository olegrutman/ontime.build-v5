
-- Make change_order_id nullable
ALTER TABLE public.actual_cost_entries ALTER COLUMN change_order_id DROP NOT NULL;

-- Add project_id column
ALTER TABLE public.actual_cost_entries ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- Add check constraint: at least one scope must be set
ALTER TABLE public.actual_cost_entries ADD CONSTRAINT actual_cost_entries_scope_check
  CHECK (change_order_id IS NOT NULL OR project_id IS NOT NULL);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view own org cost entries" ON public.actual_cost_entries;
DROP POLICY IF EXISTS "Users can insert own org cost entries" ON public.actual_cost_entries;
DROP POLICY IF EXISTS "Users can delete own org cost entries" ON public.actual_cost_entries;

-- Recreate RLS policies covering project-level entries
CREATE POLICY "Users can view own org cost entries"
  ON public.actual_cost_entries FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own org cost entries"
  ON public.actual_cost_entries FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own org cost entries"
  ON public.actual_cost_entries FOR DELETE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
  ));
