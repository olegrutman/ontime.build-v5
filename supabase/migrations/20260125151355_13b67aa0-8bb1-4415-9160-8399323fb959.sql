-- =====================================================
-- CHANGE ORDER MINI-PROJECT SCHEMA
-- =====================================================

-- 1. Change Order Projects (Mini-Project Container)
CREATE TABLE public.change_order_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Structured location data
  location_data JSONB DEFAULT '{}',
  -- Structure: { inside_outside, level, unit, room_area }
  
  -- Work details
  work_type TEXT, -- re_frame, re_install, addition, adjust, fixing
  
  -- Materials
  requires_materials BOOLEAN DEFAULT false,
  material_cost_responsibility TEXT, -- GC or TC
  
  -- Equipment
  requires_equipment BOOLEAN DEFAULT false,
  equipment_cost_responsibility TEXT, -- GC or TC
  
  -- Status flow: draft, fc_input, tc_pricing, ready_for_approval, approved, rejected, contracted
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Pricing summary (computed)
  labor_total NUMERIC(12,2) DEFAULT 0,
  material_total NUMERIC(12,2) DEFAULT 0,
  equipment_total NUMERIC(12,2) DEFAULT 0,
  final_price NUMERIC(12,2) DEFAULT 0,
  
  -- Rejection handling
  rejection_notes TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_by_role TEXT, -- GC_PM, TC_PM
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Change Order Participants
CREATE TABLE public.change_order_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID NOT NULL REFERENCES public.change_order_projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  role TEXT NOT NULL, -- GC, TC, FC, SUPPLIER
  is_active BOOLEAN DEFAULT true, -- TC can toggle FC on/off
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(change_order_id, organization_id)
);

-- 3. Field Crew Hours (with locking)
CREATE TABLE public.change_order_fc_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID NOT NULL REFERENCES public.change_order_projects(id) ON DELETE CASCADE,
  description TEXT,
  hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  hourly_rate NUMERIC(10,2), -- FC's private rate
  labor_total NUMERIC(12,2) GENERATED ALWAYS AS (hours * COALESCE(hourly_rate, 0)) STORED,
  
  -- Locking
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users(id),
  
  -- Unlock request
  unlock_requested BOOLEAN DEFAULT false,
  unlock_requested_at TIMESTAMPTZ,
  
  entered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Trade Contractor Labor (their own hours)
CREATE TABLE public.change_order_tc_labor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID NOT NULL REFERENCES public.change_order_projects(id) ON DELETE CASCADE,
  description TEXT,
  hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  hourly_rate NUMERIC(10,2), -- TC's rate
  labor_total NUMERIC(12,2) GENERATED ALWAYS AS (hours * COALESCE(hourly_rate, 0)) STORED,
  
  entered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Material Items (for TC to price or send to Supplier)
CREATE TABLE public.change_order_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID NOT NULL REFERENCES public.change_order_projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  uom TEXT DEFAULT 'EA',
  notes TEXT,
  
  -- Pricing
  unit_cost NUMERIC(10,2),
  line_total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * COALESCE(unit_cost, 0)) STORED,
  
  -- Supplier pricing
  sent_to_supplier BOOLEAN DEFAULT false,
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_priced BOOLEAN DEFAULT false,
  supplier_price NUMERIC(10,2),
  supplier_locked BOOLEAN DEFAULT false,
  supplier_locked_at TIMESTAMPTZ,
  
  -- TC Markup
  markup_percent NUMERIC(5,2) DEFAULT 0,
  final_price NUMERIC(12,2), -- Computed after markup
  
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Equipment Items
CREATE TABLE public.change_order_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID NOT NULL REFERENCES public.change_order_projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  
  -- Pricing mode
  pricing_type TEXT DEFAULT 'flat', -- flat or daily
  daily_rate NUMERIC(10,2),
  days INT DEFAULT 1,
  flat_cost NUMERIC(12,2),
  
  -- Final computed cost
  total_cost NUMERIC(12,2),
  
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Checklist Flags (for "green light" logic)
CREATE TABLE public.change_order_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID NOT NULL REFERENCES public.change_order_projects(id) ON DELETE CASCADE UNIQUE,
  
  location_complete BOOLEAN DEFAULT false,
  scope_complete BOOLEAN DEFAULT false,
  fc_hours_locked BOOLEAN DEFAULT false,
  tc_pricing_complete BOOLEAN DEFAULT false,
  materials_priced BOOLEAN DEFAULT false,
  equipment_priced BOOLEAN DEFAULT false,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.change_order_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_order_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_order_fc_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_order_tc_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_order_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_order_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_order_checklist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for change_order_projects
CREATE POLICY "Authenticated users can view change orders they participate in"
  ON public.change_order_projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_team pt
      WHERE pt.project_id = change_order_projects.project_id
      AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY "GC and TC can create change orders"
  ON public.change_order_projects FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Participants can update change orders based on status"
  ON public.change_order_projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_team pt
      WHERE pt.project_id = change_order_projects.project_id
      AND pt.user_id = auth.uid()
    )
  );

-- RLS for participants
CREATE POLICY "View participants"
  ON public.change_order_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.change_order_projects cop
      JOIN public.project_team pt ON pt.project_id = cop.project_id
      WHERE cop.id = change_order_participants.change_order_id
      AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY "Manage participants"
  ON public.change_order_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.change_order_projects cop
      JOIN public.project_team pt ON pt.project_id = cop.project_id
      WHERE cop.id = change_order_participants.change_order_id
      AND pt.user_id = auth.uid()
    )
  );

-- RLS for FC hours (Private between TC and FC)
CREATE POLICY "FC and TC can view FC hours"
  ON public.change_order_fc_hours FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.change_order_participants cop
      JOIN public.user_org_roles uor ON uor.organization_id = cop.organization_id
      WHERE cop.change_order_id = change_order_fc_hours.change_order_id
      AND uor.user_id = auth.uid()
      AND cop.role IN ('TC', 'FC')
    )
  );

CREATE POLICY "FC can manage their hours"
  ON public.change_order_fc_hours FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.change_order_participants cop
      JOIN public.user_org_roles uor ON uor.organization_id = cop.organization_id
      WHERE cop.change_order_id = change_order_fc_hours.change_order_id
      AND uor.user_id = auth.uid()
      AND cop.role = 'FC'
    )
  );

-- RLS for TC labor
CREATE POLICY "TC can manage their labor"
  ON public.change_order_tc_labor FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.change_order_participants cop
      JOIN public.user_org_roles uor ON uor.organization_id = cop.organization_id
      WHERE cop.change_order_id = change_order_tc_labor.change_order_id
      AND uor.user_id = auth.uid()
      AND cop.role = 'TC'
    )
  );

-- RLS for materials (TC and Supplier access)
CREATE POLICY "TC and Supplier can manage materials"
  ON public.change_order_materials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.change_order_participants cop
      JOIN public.user_org_roles uor ON uor.organization_id = cop.organization_id
      WHERE cop.change_order_id = change_order_materials.change_order_id
      AND uor.user_id = auth.uid()
      AND cop.role IN ('TC', 'SUPPLIER')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.change_order_projects cop
      JOIN public.project_team pt ON pt.project_id = cop.project_id
      WHERE cop.id = change_order_materials.change_order_id
      AND pt.user_id = auth.uid()
      AND pt.role = 'GC'
    )
  );

-- RLS for equipment
CREATE POLICY "Participants can manage equipment"
  ON public.change_order_equipment FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.change_order_projects cop
      JOIN public.project_team pt ON pt.project_id = cop.project_id
      WHERE cop.id = change_order_equipment.change_order_id
      AND pt.user_id = auth.uid()
    )
  );

-- RLS for checklist
CREATE POLICY "Participants can view/update checklist"
  ON public.change_order_checklist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.change_order_projects cop
      JOIN public.project_team pt ON pt.project_id = cop.project_id
      WHERE cop.id = change_order_checklist.change_order_id
      AND pt.user_id = auth.uid()
    )
  );

-- Trigger to auto-create checklist on change order creation
CREATE OR REPLACE FUNCTION public.create_change_order_checklist()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.change_order_checklist (change_order_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER on_change_order_created
AFTER INSERT ON public.change_order_projects
FOR EACH ROW
EXECUTE FUNCTION public.create_change_order_checklist();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_change_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_change_order_projects_updated_at
BEFORE UPDATE ON public.change_order_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_change_order_updated_at();

CREATE TRIGGER update_change_order_fc_hours_updated_at
BEFORE UPDATE ON public.change_order_fc_hours
FOR EACH ROW
EXECUTE FUNCTION public.update_change_order_updated_at();

CREATE TRIGGER update_change_order_tc_labor_updated_at
BEFORE UPDATE ON public.change_order_tc_labor
FOR EACH ROW
EXECUTE FUNCTION public.update_change_order_updated_at();

CREATE TRIGGER update_change_order_materials_updated_at
BEFORE UPDATE ON public.change_order_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_change_order_updated_at();

CREATE TRIGGER update_change_order_equipment_updated_at
BEFORE UPDATE ON public.change_order_equipment
FOR EACH ROW
EXECUTE FUNCTION public.update_change_order_updated_at();