-- Phase 2: Real-world task sequencing for Change Orders / Work Orders
-- All additive, all nullable. Existing rows unaffected.

ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS assembly_state text NULL,
  ADD COLUMN IF NOT EXISTS trigger_code text NULL;

COMMENT ON COLUMN public.change_orders.assembly_state IS
  'Phase 2: state of the assembly when issue was found. One of: pre_rough, roughed, sheathed_decked, dried_in. Drives whether Sasha proposes a multi-phase task sequence (demo→structural→repair→finish).';

COMMENT ON COLUMN public.change_orders.trigger_code IS
  'Phase 2: what triggered this CO/WO. One of: trade_conflict_mech, trade_conflict_elec, trade_conflict_plumb, inspector_callback, owner_request_change, field_discovery, design_revision.';

ALTER TABLE public.co_line_items
  ADD COLUMN IF NOT EXISTS task_index integer NULL,
  ADD COLUMN IF NOT EXISTS pricing_mode text NULL,
  ADD COLUMN IF NOT EXISTS task_phase text NULL;

COMMENT ON COLUMN public.co_line_items.task_index IS
  'Phase 2: ordinal position of this task in the CO''s multi-phase sequence (0-based). Null for legacy single-task COs.';

COMMENT ON COLUMN public.co_line_items.pricing_mode IS
  'Phase 2: per-task pricing override. One of: tm, fixed, unit, lump_sum. Null = inherit CO-level pricing_type.';

COMMENT ON COLUMN public.co_line_items.task_phase IS
  'Phase 2: which phase this task belongs to. One of: demo, structural, repair, finish, install. Used for sequence summaries and roll-up reporting.';

-- Helpful index for ordered task retrieval
CREATE INDEX IF NOT EXISTS idx_co_line_items_co_task_index
  ON public.co_line_items (co_id, task_index)
  WHERE task_index IS NOT NULL;