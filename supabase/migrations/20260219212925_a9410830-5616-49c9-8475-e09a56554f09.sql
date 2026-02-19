
-- =============================================
-- SECURITY FIX MIGRATION
-- =============================================

-- 1. Fix project_invites: drop anon SELECT policy
DROP POLICY IF EXISTS "Anyone can view invite by token" ON project_invites;

-- 2. Fix sov_templates: require authentication
DROP POLICY IF EXISTS "Anyone can view SOV templates" ON sov_templates;
CREATE POLICY "Authenticated users can view SOV templates"
  ON sov_templates FOR SELECT
  TO authenticated
  USING (true);

-- 3. Fix organizations: restrict visibility to related orgs only
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON organizations;
CREATE POLICY "Users can view related organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid())
    OR id IN (
      SELECT pp2.organization_id FROM project_participants pp1
      JOIN project_participants pp2 ON pp1.project_id = pp2.project_id
      WHERE pp1.organization_id IN (
        SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
      )
    )
    OR id IN (
      SELECT partner_org_id FROM trusted_partners
      WHERE organization_id IN (
        SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
      )
    )
  );

-- 4. Add PO token expiration columns
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS download_token_expires_at
    TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

-- 5. Add authorization guards to SECURITY DEFINER functions

-- 5a. execute_change_work: verify caller belongs to the work item's org
CREATE OR REPLACE FUNCTION public.execute_change_work(change_work_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cw_record RECORD;
    pricing_record RECORD;
    sov_code TEXT;
    sov_counter INTEGER := 1;
BEGIN
    -- Get the change work item
    SELECT * INTO cw_record FROM work_items WHERE id = change_work_id AND item_type = 'CHANGE_WORK';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Change work item not found';
    END IF;

    -- AUTHORIZATION CHECK
    IF NOT user_in_org(auth.uid(), cw_record.organization_id) THEN
        RAISE EXCEPTION 'Access denied: you do not belong to this organization';
    END IF;
    
    IF cw_record.state != 'APPROVED' THEN
        RAISE EXCEPTION 'Change work must be APPROVED to execute';
    END IF;
    
    FOR pricing_record IN 
        SELECT * FROM change_work_pricing 
        WHERE work_item_id = change_work_id 
        ORDER BY sort_order
    LOOP
        sov_code := cw_record.code || '-' || CHR(64 + sov_counter);
        
        INSERT INTO work_items (
            organization_id, project_id, parent_work_item_id,
            item_type, state, title, description, code, amount,
            location_ref, created_by
        ) VALUES (
            cw_record.organization_id, cw_record.project_id, change_work_id,
            'SOV_ITEM', 'EXECUTED', pricing_record.description,
            pricing_record.notes, sov_code,
            pricing_record.quantity * pricing_record.unit_price,
            cw_record.location_ref, cw_record.created_by
        );
        
        sov_counter := sov_counter + 1;
    END LOOP;
    
    UPDATE work_items 
    SET state = 'EXECUTED', updated_at = now()
    WHERE id = change_work_id;
END;
$$;

-- 5b. submit_tm_period: verify caller belongs to the work item's org
CREATE OR REPLACE FUNCTION public.submit_tm_period(period_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period tm_periods;
  v_work_item work_items;
BEGIN
  SELECT * INTO v_period FROM tm_periods WHERE id = period_id;
  
  IF v_period IS NULL THEN
    RAISE EXCEPTION 'Period not found';
  END IF;

  -- AUTHORIZATION CHECK
  SELECT * INTO v_work_item FROM work_items WHERE id = v_period.work_item_id;
  IF NOT user_in_org(auth.uid(), v_work_item.organization_id) THEN
    RAISE EXCEPTION 'Access denied: you do not belong to this organization';
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

-- 5c. approve_tm_period: verify caller belongs to the work item's org
CREATE OR REPLACE FUNCTION public.approve_tm_period(period_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period tm_periods;
  v_work_item work_items;
  v_labor_total NUMERIC;
  v_material_total NUMERIC;
  v_markup_amount NUMERIC;
  v_total_amount NUMERIC;
  v_slice_number INTEGER;
  v_slice_id UUID;
BEGIN
  SELECT * INTO v_period FROM tm_periods WHERE id = period_id;
  
  IF v_period IS NULL THEN
    RAISE EXCEPTION 'Period not found';
  END IF;

  -- AUTHORIZATION CHECK
  SELECT * INTO v_work_item FROM work_items WHERE id = v_period.work_item_id;
  IF NOT user_in_org(auth.uid(), v_work_item.organization_id) THEN
    RAISE EXCEPTION 'Access denied: you do not belong to this organization';
  END IF;
  
  IF v_period.status != 'SUBMITTED' THEN
    RAISE EXCEPTION 'Period must be in SUBMITTED status to approve';
  END IF;
  
  SELECT COALESCE(SUM(hours * COALESCE(hourly_rate, 0)), 0)
  INTO v_labor_total
  FROM tm_labor_entries
  WHERE tm_labor_entries.period_id = approve_tm_period.period_id;
  
  SELECT COALESCE(SUM(quantity * COALESCE(unit_cost, 0)), 0)
  INTO v_material_total
  FROM tm_material_entries
  WHERE tm_material_entries.period_id = approve_tm_period.period_id;
  
  v_markup_amount := (v_labor_total + v_material_total) * (v_period.markup_percent / 100);
  v_total_amount := v_labor_total + v_material_total + v_markup_amount;
  
  SELECT COALESCE(MAX(slice_number), 0) + 1
  INTO v_slice_number
  FROM tm_billable_slices
  WHERE work_item_id = v_period.work_item_id;
  
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
  
  INSERT INTO tm_billable_slices (
    period_id, work_item_id, slice_number,
    labor_amount, material_amount, markup_amount, total_amount
  ) VALUES (
    period_id, v_period.work_item_id, v_slice_number,
    v_labor_total, v_material_total, v_markup_amount, v_total_amount
  ) RETURNING id INTO v_slice_id;
  
  UPDATE work_items
  SET 
    amount = COALESCE(amount, 0) + v_total_amount,
    updated_at = now()
  WHERE id = v_period.work_item_id;
  
  RETURN v_slice_id;
END;
$$;

-- 5d. reject_tm_period: verify caller belongs to the work item's org
CREATE OR REPLACE FUNCTION public.reject_tm_period(period_id UUID, notes TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period tm_periods;
  v_work_item work_items;
BEGIN
  SELECT * INTO v_period FROM tm_periods WHERE id = period_id;
  
  IF v_period IS NULL THEN
    RAISE EXCEPTION 'Period not found';
  END IF;

  -- AUTHORIZATION CHECK
  SELECT * INTO v_work_item FROM work_items WHERE id = v_period.work_item_id;
  IF NOT user_in_org(auth.uid(), v_work_item.organization_id) THEN
    RAISE EXCEPTION 'Access denied: you do not belong to this organization';
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
