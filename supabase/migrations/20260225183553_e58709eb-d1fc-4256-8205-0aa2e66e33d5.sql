
-- 1. Add is_system flag to suppliers
ALTER TABLE public.suppliers ADD COLUMN is_system boolean NOT NULL DEFAULT false;

-- 2. Mark the existing supplier as the system supplier
UPDATE public.suppliers SET is_system = true WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- 3. Create project_designated_suppliers table
CREATE TABLE public.project_designated_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_email text,
  invited_name text,
  status text NOT NULL DEFAULT 'active',
  designated_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- 4. Create validation trigger instead of CHECK constraint for status
CREATE OR REPLACE FUNCTION public.validate_designated_supplier_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'invited', 'removed') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be active, invited, or removed.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_designated_supplier_status
  BEFORE INSERT OR UPDATE ON public.project_designated_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_designated_supplier_status();

-- 5. Enable RLS
ALTER TABLE public.project_designated_suppliers ENABLE ROW LEVEL SECURITY;

-- 6. SELECT policy: project participants + designated user themselves
CREATE POLICY "Project participants can view designated suppliers"
ON public.project_designated_suppliers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_team pt
    WHERE pt.project_id = project_designated_suppliers.project_id
    AND pt.org_id IN (
      SELECT organization_id FROM public.user_org_roles WHERE user_id = auth.uid()
    )
  )
  OR user_id = auth.uid()
);

-- 7. INSERT policy: GC/TC on accepted project team
CREATE POLICY "GC TC can designate suppliers"
ON public.project_designated_suppliers FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_team pt
    JOIN public.user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE pt.project_id = project_designated_suppliers.project_id
    AND uor.user_id = auth.uid()
    AND pt.role IN ('General Contractor', 'Trade Contractor')
    AND pt.status = 'Accepted'
  )
);

-- 8. UPDATE policy: GC/TC on accepted project team
CREATE POLICY "GC TC can update designated suppliers"
ON public.project_designated_suppliers FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_team pt
    JOIN public.user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE pt.project_id = project_designated_suppliers.project_id
    AND uor.user_id = auth.uid()
    AND pt.role IN ('General Contractor', 'Trade Contractor')
    AND pt.status = 'Accepted'
  )
);

-- 9. DELETE policy: GC/TC on accepted project team
CREATE POLICY "GC TC can delete designated suppliers"
ON public.project_designated_suppliers FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_team pt
    JOIN public.user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE pt.project_id = project_designated_suppliers.project_id
    AND uor.user_id = auth.uid()
    AND pt.role IN ('General Contractor', 'Trade Contractor')
    AND pt.status = 'Accepted'
  )
);
