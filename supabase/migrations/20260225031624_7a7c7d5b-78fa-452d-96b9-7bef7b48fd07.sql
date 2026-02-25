
-- Fix: Drop partially created objects and recreate with correct column reference

-- Drop existing objects
DROP TABLE IF EXISTS public.return_items CASCADE;
DROP TABLE IF EXISTS public.returns CASCADE;
DROP FUNCTION IF EXISTS public.validate_return() CASCADE;
DROP FUNCTION IF EXISTS public.validate_return_item() CASCADE;
DROP FUNCTION IF EXISTS public.generate_return_number() CASCADE;

-- 1. Returns table
CREATE TABLE public.returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_org_id uuid NOT NULL REFERENCES public.organizations(id),
  created_by_org_id uuid NOT NULL REFERENCES public.organizations(id),
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  return_number text,
  reason text NOT NULL,
  wrong_type text,
  reason_notes text,
  pickup_type text,
  pickup_date date,
  contact_name text,
  contact_phone text,
  instructions text,
  status text NOT NULL DEFAULT 'DRAFT',
  credit_subtotal numeric DEFAULT 0,
  restocking_type text DEFAULT 'None',
  restocking_value numeric DEFAULT 0,
  restocking_total numeric DEFAULT 0,
  net_credit_total numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  pricing_owner_org_id uuid REFERENCES public.organizations(id)
);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_return()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('DRAFT', 'SUBMITTED', 'SUPPLIER_REVIEW', 'APPROVED', 'SCHEDULED', 'PICKED_UP', 'PRICED', 'CLOSED') THEN
    RAISE EXCEPTION 'Invalid return status: %', NEW.status;
  END IF;
  IF NEW.reason NOT IN ('Extra', 'Wrong', 'Estimate Over', 'Damaged', 'Other') THEN
    RAISE EXCEPTION 'Invalid return reason: %', NEW.reason;
  END IF;
  IF NEW.reason = 'Wrong' AND (NEW.wrong_type IS NULL OR NEW.wrong_type NOT IN ('Supplier Error', 'Contractor Error')) THEN
    RAISE EXCEPTION 'wrong_type required when reason is Wrong';
  END IF;
  IF NEW.reason = 'Other' AND (NEW.reason_notes IS NULL OR NEW.reason_notes = '') THEN
    RAISE EXCEPTION 'reason_notes required when reason is Other';
  END IF;
  IF NEW.pickup_type IS NOT NULL AND NEW.pickup_type NOT IN ('Supplier Pickup', 'Contractor Drop-off') THEN
    RAISE EXCEPTION 'Invalid pickup_type: %', NEW.pickup_type;
  END IF;
  IF NEW.restocking_type IS NOT NULL AND NEW.restocking_type NOT IN ('Percent', 'Flat', 'None') THEN
    RAISE EXCEPTION 'Invalid restocking_type: %', NEW.restocking_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_return_trigger
BEFORE INSERT OR UPDATE ON public.returns
FOR EACH ROW EXECUTE FUNCTION public.validate_return();

-- Auto-number trigger
CREATE OR REPLACE FUNCTION public.generate_return_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN return_number ~ '^R-[0-9]+$'
      THEN CAST(SUBSTRING(return_number FROM 3) AS integer)
      ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM public.returns
  WHERE project_id = NEW.project_id;

  NEW.return_number := 'R-' || LPAD(next_num::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_return_number
BEFORE INSERT ON public.returns
FOR EACH ROW EXECUTE FUNCTION public.generate_return_number();

-- 2. Return items table
CREATE TABLE public.return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  po_line_item_id uuid NOT NULL REFERENCES public.po_line_items(id),
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id),
  description_snapshot text NOT NULL,
  uom text NOT NULL DEFAULT 'EA',
  qty_requested numeric NOT NULL DEFAULT 0,
  condition text NOT NULL DEFAULT 'Unknown',
  condition_notes text,
  returnable_flag text NOT NULL DEFAULT 'Pending',
  nonreturnable_reason text,
  credit_unit_price numeric DEFAULT 0,
  credit_line_total numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger for return_items
CREATE OR REPLACE FUNCTION public.validate_return_item()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.condition NOT IN ('New Unopened', 'New Opened', 'Good', 'Damaged', 'Wet', 'Cut', 'Painted', 'Mixed', 'Unknown') THEN
    RAISE EXCEPTION 'Invalid condition: %', NEW.condition;
  END IF;
  IF NEW.condition IN ('Damaged', 'Wet', 'Cut', 'Painted', 'Mixed', 'Unknown') AND (NEW.condition_notes IS NULL OR NEW.condition_notes = '') THEN
    RAISE EXCEPTION 'condition_notes required for condition: %', NEW.condition;
  END IF;
  IF NEW.returnable_flag NOT IN ('Pending', 'Yes', 'No') THEN
    RAISE EXCEPTION 'Invalid returnable_flag: %', NEW.returnable_flag;
  END IF;
  IF NEW.returnable_flag = 'No' AND (NEW.nonreturnable_reason IS NULL OR NEW.nonreturnable_reason = '') THEN
    RAISE EXCEPTION 'nonreturnable_reason required when returnable_flag is No';
  END IF;
  IF NEW.qty_requested < 0 THEN
    RAISE EXCEPTION 'qty_requested cannot be negative';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_return_item_trigger
BEFORE INSERT OR UPDATE ON public.return_items
FOR EACH ROW EXECUTE FUNCTION public.validate_return_item();

-- 3. Indexes
CREATE INDEX idx_returns_project_id ON public.returns(project_id);
CREATE INDEX idx_returns_supplier_org_id ON public.returns(supplier_org_id);
CREATE INDEX idx_returns_created_by_org_id ON public.returns(created_by_org_id);
CREATE INDEX idx_returns_status ON public.returns(status);
CREATE INDEX idx_return_items_return_id ON public.return_items(return_id);
CREATE INDEX idx_return_items_po_line_item_id ON public.return_items(po_line_item_id);

-- 4. Enable RLS
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for returns

CREATE POLICY "Users can view returns for their orgs"
ON public.returns FOR SELECT TO authenticated
USING (
  user_in_org(auth.uid(), created_by_org_id)
  OR user_in_org(auth.uid(), supplier_org_id)
  OR (pricing_owner_org_id IS NOT NULL AND user_in_org(auth.uid(), pricing_owner_org_id))
);

-- INSERT: Users in GC or TC orgs on the project team (using org_id column)
CREATE POLICY "GC/TC can create returns"
ON public.returns FOR INSERT TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND user_in_org(auth.uid(), created_by_org_id)
  AND EXISTS (
    SELECT 1 FROM project_team pt
    WHERE pt.project_id = returns.project_id
    AND pt.org_id = returns.created_by_org_id
    AND pt.status = 'accepted'
    AND pt.role IN ('General Contractor', 'Trade Contractor')
  )
);

CREATE POLICY "Authorized orgs can update returns"
ON public.returns FOR UPDATE TO authenticated
USING (
  (user_in_org(auth.uid(), created_by_org_id) AND status IN ('DRAFT', 'APPROVED', 'SCHEDULED', 'PRICED'))
  OR (user_in_org(auth.uid(), supplier_org_id) AND status IN ('SUBMITTED', 'SUPPLIER_REVIEW', 'PICKED_UP', 'SCHEDULED'))
);

CREATE POLICY "Creator can delete draft returns"
ON public.returns FOR DELETE TO authenticated
USING (
  user_in_org(auth.uid(), created_by_org_id)
  AND status = 'DRAFT'
);

-- 6. RLS Policies for return_items

CREATE POLICY "Users can view return items via return access"
ON public.return_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM returns r
    WHERE r.id = return_items.return_id
    AND (
      user_in_org(auth.uid(), r.created_by_org_id)
      OR user_in_org(auth.uid(), r.supplier_org_id)
      OR (r.pricing_owner_org_id IS NOT NULL AND user_in_org(auth.uid(), r.pricing_owner_org_id))
    )
  )
);

CREATE POLICY "Creator can add return items to draft returns"
ON public.return_items FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM returns r
    WHERE r.id = return_items.return_id
    AND r.status = 'DRAFT'
    AND user_in_org(auth.uid(), r.created_by_org_id)
  )
);

CREATE POLICY "Authorized orgs can update return items"
ON public.return_items FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM returns r
    WHERE r.id = return_items.return_id
    AND (
      (user_in_org(auth.uid(), r.created_by_org_id) AND r.status = 'DRAFT')
      OR (user_in_org(auth.uid(), r.supplier_org_id) AND r.status IN ('SUPPLIER_REVIEW', 'PICKED_UP'))
    )
  )
);

CREATE POLICY "Creator can delete return items from draft returns"
ON public.return_items FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM returns r
    WHERE r.id = return_items.return_id
    AND r.status = 'DRAFT'
    AND user_in_org(auth.uid(), r.created_by_org_id)
  )
);

-- 7. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.returns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.return_items;
