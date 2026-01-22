-- TM_WORK: Time & Materials Work Item Handling
-- Supports daily/weekly hour entry, material usage, period approvals, and billable slices

-- =====================================================
-- TM Periods: Billing periods for T&M work
-- =====================================================
CREATE TABLE public.tm_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'WEEKLY' CHECK (period_type IN ('DAILY', 'WEEKLY')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'SUBMITTED', 'APPROVED', 'REJECTED')),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  rejection_notes TEXT,
  labor_total NUMERIC DEFAULT 0,
  material_total NUMERIC DEFAULT 0,
  markup_percent NUMERIC DEFAULT 0,
  final_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_period CHECK (period_end >= period_start)
);

-- =====================================================
-- TM Labor Entries: Hours logged within a period
-- =====================================================
CREATE TABLE public.tm_labor_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES public.tm_periods(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  hours NUMERIC NOT NULL CHECK (hours > 0),
  description TEXT,
  entered_by UUID NOT NULL,
  hourly_rate NUMERIC, -- Only visible to TC_PM, hidden from GC and FS
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TM Material Entries: Materials used within a period
-- =====================================================
CREATE TABLE public.tm_material_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES public.tm_periods(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  uom TEXT NOT NULL DEFAULT 'EA',
  unit_cost NUMERIC DEFAULT 0, -- Only visible to TC_PM
  supplier_id UUID REFERENCES public.suppliers(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TM Billable Slices: Generated when period is approved
-- =====================================================
CREATE TABLE public.tm_billable_slices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES public.tm_periods(id) ON DELETE CASCADE,
  work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  slice_number INTEGER NOT NULL,
  labor_amount NUMERIC NOT NULL DEFAULT 0,
  material_amount NUMERIC NOT NULL DEFAULT 0,
  markup_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  invoiced_at TIMESTAMPTZ,
  invoice_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_period_slice UNIQUE (period_id)
);

-- =====================================================
-- Enable RLS
-- =====================================================
ALTER TABLE public.tm_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_labor_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_material_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_billable_slices ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TM Periods RLS Policies
-- =====================================================

-- Org members can view periods for their work items
CREATE POLICY "Org members can view tm_periods"
  ON public.tm_periods FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM work_items wi
    WHERE wi.id = tm_periods.work_item_id
    AND user_in_org(auth.uid(), wi.organization_id)
  ));

-- TC_PM and FS can create periods
CREATE POLICY "TC_PM and FS can create tm_periods"
  ON public.tm_periods FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM work_items wi
    WHERE wi.id = tm_periods.work_item_id
    AND user_in_org(auth.uid(), wi.organization_id)
    AND (has_role(auth.uid(), 'TC_PM') OR has_role(auth.uid(), 'FS'))
  ));

-- TC_PM can update any period for their org
CREATE POLICY "TC_PM can update tm_periods"
  ON public.tm_periods FOR UPDATE
  USING (
    has_role(auth.uid(), 'TC_PM')
    AND EXISTS (
      SELECT 1 FROM work_items wi
      WHERE wi.id = tm_periods.work_item_id
      AND user_in_org(auth.uid(), wi.organization_id)
    )
  );

-- FS can update OPEN periods only
CREATE POLICY "FS can update OPEN tm_periods"
  ON public.tm_periods FOR UPDATE
  USING (
    has_role(auth.uid(), 'FS')
    AND status = 'OPEN'
    AND EXISTS (
      SELECT 1 FROM work_items wi
      WHERE wi.id = tm_periods.work_item_id
      AND user_in_org(auth.uid(), wi.organization_id)
    )
  );

-- GC_PM can approve/reject SUBMITTED periods
CREATE POLICY "GC_PM can update SUBMITTED tm_periods"
  ON public.tm_periods FOR UPDATE
  USING (
    is_gc_pm(auth.uid())
    AND status = 'SUBMITTED'
    AND EXISTS (
      SELECT 1 FROM work_items wi
      WHERE wi.id = tm_periods.work_item_id
      AND user_in_org(auth.uid(), wi.organization_id)
    )
  );

-- =====================================================
-- TM Labor Entries RLS Policies (with visibility restrictions)
-- =====================================================

-- FS can view own labor entries (without rate)
CREATE POLICY "FS can view own tm_labor_entries"
  ON public.tm_labor_entries FOR SELECT
  USING (
    has_role(auth.uid(), 'FS')
    AND entered_by = auth.uid()
  );

-- TC_PM can view all labor entries for their org
CREATE POLICY "TC_PM can view tm_labor_entries"
  ON public.tm_labor_entries FOR SELECT
  USING (
    has_role(auth.uid(), 'TC_PM')
    AND EXISTS (
      SELECT 1 FROM tm_periods tp
      JOIN work_items wi ON wi.id = tp.work_item_id
      WHERE tp.id = tm_labor_entries.period_id
      AND user_in_org(auth.uid(), wi.organization_id)
    )
  );

-- GC_PM CANNOT view individual labor entries (only period totals after approval)
-- No SELECT policy for GC_PM on tm_labor_entries

-- FS can insert own labor entries for OPEN periods
CREATE POLICY "FS can insert tm_labor_entries"
  ON public.tm_labor_entries FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'FS')
    AND entered_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tm_periods tp
      JOIN work_items wi ON wi.id = tp.work_item_id
      WHERE tp.id = tm_labor_entries.period_id
      AND tp.status = 'OPEN'
      AND user_in_org(auth.uid(), wi.organization_id)
    )
  );

-- FS can update own entries in OPEN periods
CREATE POLICY "FS can update own tm_labor_entries"
  ON public.tm_labor_entries FOR UPDATE
  USING (
    has_role(auth.uid(), 'FS')
    AND entered_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tm_periods tp
      WHERE tp.id = tm_labor_entries.period_id
      AND tp.status = 'OPEN'
    )
  );

-- FS can delete own entries in OPEN periods
CREATE POLICY "FS can delete own tm_labor_entries"
  ON public.tm_labor_entries FOR DELETE
  USING (
    has_role(auth.uid(), 'FS')
    AND entered_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tm_periods tp
      WHERE tp.id = tm_labor_entries.period_id
      AND tp.status = 'OPEN'
    )
  );

-- TC_PM can manage labor entries (including setting rates)
CREATE POLICY "TC_PM can insert tm_labor_entries"
  ON public.tm_labor_entries FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'TC_PM')
    AND EXISTS (
      SELECT 1 FROM tm_periods tp
      JOIN work_items wi ON wi.id = tp.work_item_id
      WHERE tp.id = tm_labor_entries.period_id
      AND user_in_org(auth.uid(), wi.organization_id)
    )
  );

CREATE POLICY "TC_PM can update tm_labor_entries"
  ON public.tm_labor_entries FOR UPDATE
  USING (
    has_role(auth.uid(), 'TC_PM')
    AND EXISTS (
      SELECT 1 FROM tm_periods tp
      JOIN work_items wi ON wi.id = tp.work_item_id
      WHERE tp.id = tm_labor_entries.period_id
      AND user_in_org(auth.uid(), wi.organization_id)
    )
  );

CREATE POLICY "TC_PM can delete tm_labor_entries"
  ON public.tm_labor_entries FOR DELETE
  USING (
    has_role(auth.uid(), 'TC_PM')
    AND EXISTS (
      SELECT 1 FROM tm_periods tp
      JOIN work_items wi ON wi.id = tp.work_item_id
      WHERE tp.id = tm_labor_entries.period_id
      AND tp.status IN ('OPEN', 'REJECTED')
      AND user_in_org(auth.uid(), wi.organization_id)
    )
  );

-- =====================================================
-- TM Material Entries RLS Policies
-- =====================================================

-- FS can view material entries (without cost)
CREATE POLICY "FS can view tm_material_entries"
  ON public.tm_material_entries FOR SELECT
  USING (
    has_role(auth.uid(), 'FS')
    AND EXISTS (
      SELECT 1 FROM tm_periods tp
      JOIN work_items wi ON wi.id = tp.work_item_id
      WHERE tp.id = tm_material_entries.period_id
      AND user_in_org(auth.uid(), wi.organization_id)
    )
  );

-- TC_PM can view all material entries
CREATE POLICY "TC_PM can view tm_material_entries"
  ON public.tm_material_entries FOR SELECT
  USING (
    has_role(auth.uid(), 'TC_PM')
    AND EXISTS (
      SELECT 1 FROM tm_periods tp
      JOIN work_items wi ON wi.id = tp.work_item_id
      WHERE tp.id = tm_material_entries.period_id
      AND user_in_org(auth.uid(), wi.organization_id)
    )
  );

-- GC_PM can view material entries after period is approved (without unit_cost details)
CREATE POLICY "GC_PM can view approved tm_material_entries"
  ON public.tm_material_entries FOR SELECT
  USING (
    is_gc_pm(auth.uid())
    AND EXISTS (
      SELECT 1 FROM tm_periods tp
      JOIN work_items wi ON wi.id = tp.work_item_id
      WHERE tp.id = tm_material_entries.period_id
      AND tp.status = 'APPROVED'
      AND user_in_org(auth.uid(), wi.organization_id)
    )
  );

-- FS can insert material entries for OPEN periods
CREATE POLICY "FS can insert tm_material_entries"
  ON public.tm_material_entries FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'FS')
    AND EXISTS (
      SELECT 1 FROM tm_periods tp
      JOIN work_items wi ON wi.id = tp.work_item_id
      WHERE tp.id = tm_material_entries.period_id
      AND tp.status = 'OPEN'
      AND user_in_org(auth.uid(), wi.organization_id)
    )
  );

-- FS can update material entries in OPEN periods
CREATE POLICY "FS can update tm_material_entries"
  ON public.tm_material_entries FOR UPDATE
  USING (
    has_role(auth.uid(), 'FS')
    AND EXISTS (
      SELECT 1 FROM tm_periods tp
      WHERE tp.id = tm_material_entries.period_id
      AND tp.status = 'OPEN'
    )
  );

-- FS can delete material entries in OPEN periods
CREATE POLICY "FS can delete tm_material_entries"
  ON public.tm_material_entries FOR DELETE
  USING (
    has_role(auth.uid(), 'FS')
    AND EXISTS (
      SELECT 1 FROM tm_periods tp
      WHERE tp.id = tm_material_entries.period_id
      AND tp.status = 'OPEN'
    )
  );

-- TC_PM can manage material entries
CREATE POLICY "TC_PM can insert tm_material_entries"
  ON public.tm_material_entries FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'TC_PM')
    AND EXISTS (
      SELECT 1 FROM tm_periods tp
      JOIN work_items wi ON wi.id = tp.work_item_id
      WHERE tp.id = tm_material_entries.period_id
      AND user_in_org(auth.uid(), wi.organization_id)
    )
  );

CREATE POLICY "TC_PM can update tm_material_entries"
  ON public.tm_material_entries FOR UPDATE
  USING (
    has_role(auth.uid(), 'TC_PM')
    AND EXISTS (
      SELECT 1 FROM tm_periods tp
      JOIN work_items wi ON wi.id = tp.work_item_id
      WHERE tp.id = tm_material_entries.period_id
      AND user_in_org(auth.uid(), wi.organization_id)
    )
  );

CREATE POLICY "TC_PM can delete tm_material_entries"
  ON public.tm_material_entries FOR DELETE
  USING (
    has_role(auth.uid(), 'TC_PM')
    AND EXISTS (
      SELECT 1 FROM tm_periods tp
      JOIN work_items wi ON wi.id = tp.work_item_id
      WHERE tp.id = tm_material_entries.period_id
      AND tp.status IN ('OPEN', 'REJECTED')
      AND user_in_org(auth.uid(), wi.organization_id)
    )
  );

-- =====================================================
-- TM Billable Slices RLS Policies
-- =====================================================

-- Org members can view billable slices
CREATE POLICY "Org members can view tm_billable_slices"
  ON public.tm_billable_slices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM work_items wi
    WHERE wi.id = tm_billable_slices.work_item_id
    AND user_in_org(auth.uid(), wi.organization_id)
  ));

-- Only system (via function) creates billable slices - no direct insert policy

-- =====================================================
-- Views for column-level security
-- =====================================================

-- View for FS: Labor entries without hourly_rate
CREATE OR REPLACE VIEW public.tm_labor_entries_fs AS
SELECT 
  id, period_id, entry_date, hours, description, entered_by, created_at, updated_at
FROM public.tm_labor_entries;

-- View for GC: Period summary only (no individual entries, just totals)
CREATE OR REPLACE VIEW public.tm_periods_gc AS
SELECT 
  id, work_item_id, period_start, period_end, period_type, status,
  submitted_at, approved_at, rejection_notes,
  final_amount, -- Only see final rolled-up amount
  created_at, updated_at
FROM public.tm_periods
WHERE status IN ('SUBMITTED', 'APPROVED');

-- View for FS: Material entries without unit_cost
CREATE OR REPLACE VIEW public.tm_material_entries_fs AS
SELECT 
  id, period_id, entry_date, description, quantity, uom, supplier_id, notes, created_at, updated_at
FROM public.tm_material_entries;

-- =====================================================
-- Function: Approve TM Period and Generate Billable Slice
-- =====================================================
CREATE OR REPLACE FUNCTION public.approve_tm_period(period_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period tm_periods;
  v_labor_total NUMERIC;
  v_material_total NUMERIC;
  v_markup_amount NUMERIC;
  v_total_amount NUMERIC;
  v_slice_number INTEGER;
  v_slice_id UUID;
BEGIN
  -- Get the period
  SELECT * INTO v_period FROM tm_periods WHERE id = period_id;
  
  IF v_period IS NULL THEN
    RAISE EXCEPTION 'Period not found';
  END IF;
  
  IF v_period.status != 'SUBMITTED' THEN
    RAISE EXCEPTION 'Period must be in SUBMITTED status to approve';
  END IF;
  
  -- Calculate labor total (hours * rate)
  SELECT COALESCE(SUM(hours * COALESCE(hourly_rate, 0)), 0)
  INTO v_labor_total
  FROM tm_labor_entries
  WHERE tm_labor_entries.period_id = approve_tm_period.period_id;
  
  -- Calculate material total (quantity * unit_cost)
  SELECT COALESCE(SUM(quantity * COALESCE(unit_cost, 0)), 0)
  INTO v_material_total
  FROM tm_material_entries
  WHERE tm_material_entries.period_id = approve_tm_period.period_id;
  
  -- Calculate markup
  v_markup_amount := (v_labor_total + v_material_total) * (v_period.markup_percent / 100);
  v_total_amount := v_labor_total + v_material_total + v_markup_amount;
  
  -- Get next slice number for this work item
  SELECT COALESCE(MAX(slice_number), 0) + 1
  INTO v_slice_number
  FROM tm_billable_slices
  WHERE work_item_id = v_period.work_item_id;
  
  -- Update period with calculated totals
  UPDATE tm_periods
  SET 
    status = 'APPROVED',
    approved_at = now(),
    approved_by = auth.uid(),
    labor_total = v_labor_total,
    material_total = v_material_total,
    final_amount = v_total_amount,
    updated_at = now()
  WHERE id = period_id;
  
  -- Create billable slice
  INSERT INTO tm_billable_slices (
    period_id, work_item_id, slice_number,
    labor_amount, material_amount, markup_amount, total_amount
  ) VALUES (
    period_id, v_period.work_item_id, v_slice_number,
    v_labor_total, v_material_total, v_markup_amount, v_total_amount
  ) RETURNING id INTO v_slice_id;
  
  -- Update work item amount (cumulative)
  UPDATE work_items
  SET 
    amount = COALESCE(amount, 0) + v_total_amount,
    updated_at = now()
  WHERE id = v_period.work_item_id;
  
  RETURN v_slice_id;
END;
$$;

-- =====================================================
-- Function: Submit TM Period for Approval
-- =====================================================
CREATE OR REPLACE FUNCTION public.submit_tm_period(period_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period tm_periods;
BEGIN
  SELECT * INTO v_period FROM tm_periods WHERE id = period_id;
  
  IF v_period IS NULL THEN
    RAISE EXCEPTION 'Period not found';
  END IF;
  
  IF v_period.status NOT IN ('OPEN', 'REJECTED') THEN
    RAISE EXCEPTION 'Period must be OPEN or REJECTED to submit';
  END IF;
  
  UPDATE tm_periods
  SET 
    status = 'SUBMITTED',
    submitted_at = now(),
    submitted_by = auth.uid(),
    rejection_notes = NULL,
    updated_at = now()
  WHERE id = period_id;
END;
$$;

-- =====================================================
-- Function: Reject TM Period
-- =====================================================
CREATE OR REPLACE FUNCTION public.reject_tm_period(period_id UUID, notes TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period tm_periods;
BEGIN
  SELECT * INTO v_period FROM tm_periods WHERE id = period_id;
  
  IF v_period IS NULL THEN
    RAISE EXCEPTION 'Period not found';
  END IF;
  
  IF v_period.status != 'SUBMITTED' THEN
    RAISE EXCEPTION 'Period must be in SUBMITTED status to reject';
  END IF;
  
  UPDATE tm_periods
  SET 
    status = 'REJECTED',
    rejection_notes = notes,
    updated_at = now()
  WHERE id = period_id;
END;
$$;

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX idx_tm_periods_work_item ON public.tm_periods(work_item_id);
CREATE INDEX idx_tm_periods_status ON public.tm_periods(status);
CREATE INDEX idx_tm_labor_entries_period ON public.tm_labor_entries(period_id);
CREATE INDEX idx_tm_labor_entries_entered_by ON public.tm_labor_entries(entered_by);
CREATE INDEX idx_tm_material_entries_period ON public.tm_material_entries(period_id);
CREATE INDEX idx_tm_billable_slices_work_item ON public.tm_billable_slices(work_item_id);

-- =====================================================
-- Triggers for updated_at
-- =====================================================
CREATE TRIGGER update_tm_periods_updated_at
  BEFORE UPDATE ON public.tm_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tm_labor_entries_updated_at
  BEFORE UPDATE ON public.tm_labor_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tm_material_entries_updated_at
  BEFORE UPDATE ON public.tm_material_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();