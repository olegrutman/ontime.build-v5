ALTER TABLE public.co_proposals ADD COLUMN IF NOT EXISTS scope_type text NOT NULL DEFAULT 'labor_materials_equipment';
ALTER TABLE public.co_proposals ADD CONSTRAINT co_proposals_scope_type_check CHECK (scope_type IN ('labor_only','labor_materials','labor_materials_equipment'));
ALTER TABLE public.co_proposals ADD COLUMN IF NOT EXISTS show_wo_numbers boolean NOT NULL DEFAULT true;