ALTER TABLE public.gc_owner_billings
  ADD CONSTRAINT gc_owner_billings_billed_positive CHECK (billed_amount > 0),
  ADD CONSTRAINT gc_owner_billings_collected_range CHECK (collected_amount >= 0 AND collected_amount <= billed_amount);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gc_owner_billings_unique_number
  ON public.gc_owner_billings(project_id, gc_org_id, billing_number)
  WHERE billing_number IS NOT NULL;