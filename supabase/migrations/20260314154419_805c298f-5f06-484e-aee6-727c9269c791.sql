
-- Add PENDING_APPROVAL to po_status enum
ALTER TYPE public.po_status ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL' BEFORE 'SUBMITTED';

-- Add approval tracking columns
ALTER TABLE public.purchase_orders 
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;
