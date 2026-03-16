
-- Migration 1: New columns on change_order_projects
ALTER TABLE public.change_order_projects
  ADD COLUMN IF NOT EXISTS wo_mode TEXT,
  ADD COLUMN IF NOT EXISTS wo_request_type TEXT,
  ADD COLUMN IF NOT EXISTS tc_labor_rate DECIMAL,
  ADD COLUMN IF NOT EXISTS fc_labor_rate DECIMAL,
  ADD COLUMN IF NOT EXISTS use_fc_hours_at_tc_rate BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS materials_markup_pct DECIMAL NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS equipment_markup_pct DECIMAL NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS location_tag TEXT,
  ADD COLUMN IF NOT EXISTS draft_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by_user_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS gc_request_note TEXT;
