-- Fix broken PO sync trigger and optimize supplier PO pricing policies.

-- 1) Replace stale trigger function that referenced dropped tables.
CREATE OR REPLACE FUNCTION public.fn_sync_po_status_to_wo_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Legacy work-order checklist tables were removed. Keep this trigger safe and
  -- touch the linked change order so listeners can refresh without raising errors.
  IF NEW.source_change_order_material_request IS TRUE
     AND NEW.source_change_order_id IS NOT NULL
     AND NEW.status IN ('PRICED', 'ORDERED', 'FINALIZED', 'READY_FOR_DELIVERY', 'DELIVERED')
     AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
    UPDATE public.change_orders
    SET updated_at = now()
    WHERE id = NEW.source_change_order_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Helper functions for supplier PO access/pricing checks.
CREATE OR REPLACE FUNCTION public.is_supplier_for_purchase_order(_po_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.purchase_orders po
    JOIN public.suppliers s ON s.id = po.supplier_id
    WHERE po.id = _po_id
      AND public.user_in_org(_user_id, s.organization_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_supplier_edit_po_pricing(_po_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.purchase_orders po
    JOIN public.suppliers s ON s.id = po.supplier_id
    WHERE po.id = _po_id
      AND po.status IN ('SUBMITTED', 'PRICED')
      AND public.user_in_org(_user_id, s.organization_id)
  );
$$;

-- 3) Replace expensive supplier line-item pricing policy with helper-based version.
DROP POLICY IF EXISTS "Supplier can update pricing on SUBMITTED POs" ON public.po_line_items;
DROP POLICY IF EXISTS "Supplier can update pricing on SUBMITTED or PRICED POs" ON public.po_line_items;

CREATE POLICY "Supplier can update pricing on SUBMITTED or PRICED POs"
ON public.po_line_items
FOR UPDATE
USING (public.can_supplier_edit_po_pricing(po_id))
WITH CHECK (public.can_supplier_edit_po_pricing(po_id));

-- 4) Replace supplier purchase_order update policies with helper-based versions
-- that match the UI lifecycle:
-- SUBMITTED -> PRICED (lock pricing)
-- SUBMITTED -> ORDERED (skip pricing when estimate pricing is accepted)
-- PRICED -> ORDERED
-- ORDERED -> DELIVERED
DROP POLICY IF EXISTS "Supplier can mark PO as priced" ON public.purchase_orders;
DROP POLICY IF EXISTS "Supplier can mark PO as ordered" ON public.purchase_orders;
DROP POLICY IF EXISTS "Supplier can mark PO as delivered" ON public.purchase_orders;
DROP POLICY IF EXISTS "Supplier can update submitted POs" ON public.purchase_orders;
DROP POLICY IF EXISTS "Supplier can update priced POs" ON public.purchase_orders;

CREATE POLICY "Supplier can update submitted POs"
ON public.purchase_orders
FOR UPDATE
USING (
  public.is_supplier_for_purchase_order(id)
  AND status = 'SUBMITTED'
)
WITH CHECK (
  public.is_supplier_for_purchase_order(id)
  AND status IN ('SUBMITTED', 'PRICED', 'ORDERED')
);

CREATE POLICY "Supplier can update priced POs"
ON public.purchase_orders
FOR UPDATE
USING (
  public.is_supplier_for_purchase_order(id)
  AND status = 'PRICED'
)
WITH CHECK (
  public.is_supplier_for_purchase_order(id)
  AND status IN ('PRICED', 'ORDERED')
);

CREATE POLICY "Supplier can mark PO as delivered"
ON public.purchase_orders
FOR UPDATE
USING (
  public.is_supplier_for_purchase_order(id)
  AND status = 'ORDERED'
)
WITH CHECK (
  public.is_supplier_for_purchase_order(id)
  AND status = 'DELIVERED'
);