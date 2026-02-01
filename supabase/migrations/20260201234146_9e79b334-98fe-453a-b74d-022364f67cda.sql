-- Supplier estimates table
CREATE TABLE supplier_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_org_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  work_order_id UUID REFERENCES change_order_projects(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  total_amount NUMERIC(12,2) DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Supplier estimate line items
CREATE TABLE supplier_estimate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES supplier_estimates(id) ON DELETE CASCADE,
  supplier_sku TEXT,
  description TEXT NOT NULL,
  quantity NUMERIC(12,4) NOT NULL DEFAULT 1,
  uom TEXT NOT NULL DEFAULT 'EA',
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE supplier_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_estimate_items ENABLE ROW LEVEL SECURITY;

-- Supplier can manage their own estimates
CREATE POLICY "Suppliers manage own estimates" ON supplier_estimates
  FOR ALL USING (
    supplier_org_id IN (
      SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
    )
  );

-- Project team members can view estimates
CREATE POLICY "Project team can view estimates" ON supplier_estimates
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_participants 
      WHERE organization_id IN (
        SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
      )
    )
  );

-- Estimate items: access via parent estimate
CREATE POLICY "Access estimate items via estimate" ON supplier_estimate_items
  FOR ALL USING (
    estimate_id IN (SELECT id FROM supplier_estimates)
  );

-- Create trigger for updated_at
CREATE TRIGGER update_supplier_estimates_updated_at
  BEFORE UPDATE ON supplier_estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();