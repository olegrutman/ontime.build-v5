-- Add external approval settings to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS owner_approval_threshold numeric,
  ADD COLUMN IF NOT EXISTS owner_approval_email text,
  ADD COLUMN IF NOT EXISTS architect_approval_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS architect_approval_email text;

-- Add owner approval fields to change_orders
ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS owner_approval_status text NOT NULL DEFAULT 'not_required'
    CHECK (owner_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS owner_approval_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS owner_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS owner_approver_name text,
  ADD COLUMN IF NOT EXISTS owner_rejection_note text;

-- Add architect approval fields to change_orders
ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS architect_approval_status text NOT NULL DEFAULT 'not_required'
    CHECK (architect_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS architect_approval_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS architect_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS architect_approver_name text,
  ADD COLUMN IF NOT EXISTS architect_rejection_note text;

-- Allow public access to change_orders by token (for external approval page)
CREATE POLICY "Public can view CO by approval token"
  ON public.change_orders FOR SELECT
  TO anon
  USING (
    owner_approval_token IS NOT NULL
    OR architect_approval_token IS NOT NULL
  );

-- Allow anon to update CO approval fields via token
CREATE POLICY "Public can update CO approval via token"
  ON public.change_orders FOR UPDATE
  TO anon
  USING (
    owner_approval_token IS NOT NULL
    OR architect_approval_token IS NOT NULL
  )
  WITH CHECK (
    owner_approval_token IS NOT NULL
    OR architect_approval_token IS NOT NULL
  );