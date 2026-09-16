-- Which company pays for materials on this project (the buyer of a supplier-raised PO)
CREATE OR REPLACE FUNCTION public.resolve_supplier_po_buyer_org(_project_id uuid, _supplier_org_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT pp.organization_id
       FROM project_participants pp
       JOIN organizations o ON o.id = pp.organization_id
      WHERE pp.project_id = _project_id
        AND o.type = 'GC'::org_type
        AND EXISTS (
          SELECT 1 FROM project_contracts pc
           WHERE pc.project_id = _project_id
             AND pc.material_responsibility = 'GC'
        )
      ORDER BY o.created_at
      LIMIT 1),
    (SELECT pc.to_org_id
       FROM project_contracts pc
      WHERE pc.project_id = _project_id
        AND pc.from_org_id = _supplier_org_id
      ORDER BY pc.created_at
      LIMIT 1),
    (SELECT pp.organization_id
       FROM project_participants pp
       JOIN organizations o ON o.id = pp.organization_id
      WHERE pp.project_id = _project_id
        AND o.type = 'GC'::org_type
      ORDER BY o.created_at
      LIMIT 1)
  )
$$;

-- Was this PO raised by the supplier itself?
CREATE OR REPLACE FUNCTION public.is_supplier_raised_po(_po_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
     WHERE po.id = _po_id
       AND po.created_by_org_id = s.organization_id
  )
$$;

-- The buying company may approve or return a supplier-raised PO
CREATE OR REPLACE FUNCTION public.can_approve_supplier_po(_po_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
     WHERE po.id = _po_id
       AND po.created_by_org_id = s.organization_id
       AND po.pricing_owner_org_id IS NOT NULL
       AND po.pricing_owner_org_id <> s.organization_id
       AND public.user_in_org(_user_id, po.pricing_owner_org_id)
       AND public.is_pm_role(_user_id)
  )
$$;

REVOKE ALL ON FUNCTION public.resolve_supplier_po_buyer_org(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_supplier_raised_po(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_approve_supplier_po(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_supplier_po_buyer_org(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_supplier_raised_po(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_approve_supplier_po(uuid, uuid) TO authenticated, service_role;

-- Supplier may raise a PO on a project it participates in, for its own supplier record
DROP POLICY IF EXISTS "Supplier can raise POs on their projects" ON public.purchase_orders;
CREATE POLICY "Supplier can raise POs on their projects"
ON public.purchase_orders
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_in_org(auth.uid(), organization_id)
  AND created_by_org_id = organization_id
  AND status = 'ACTIVE'::po_status
  AND project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.suppliers s
     WHERE s.id = supplier_id
       AND s.organization_id = organization_id
  )
  AND EXISTS (
    SELECT 1 FROM public.project_participants pp
     WHERE pp.project_id = purchase_orders.project_id
       AND pp.organization_id = organization_id
  )
);

-- Supplier may send its own draft PO for approval (and resubmit after a return)
DROP POLICY IF EXISTS "Supplier can send raised PO for approval" ON public.purchase_orders;
CREATE POLICY "Supplier can send raised PO for approval"
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (
  status = 'ACTIVE'::po_status
  AND public.is_supplier_raised_po(id)
  AND public.user_in_org(auth.uid(), organization_id)
)
WITH CHECK (
  status = ANY (ARRAY['ACTIVE'::po_status, 'PENDING_APPROVAL'::po_status])
  AND public.user_in_org(auth.uid(), organization_id)
);

-- Buying company may approve (release to ORDERED) or return the PO to the supplier
DROP POLICY IF EXISTS "Buyer can act on supplier-raised POs" ON public.purchase_orders;
CREATE POLICY "Buyer can act on supplier-raised POs"
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (
  status = 'PENDING_APPROVAL'::po_status
  AND public.can_approve_supplier_po(id, auth.uid())
)
WITH CHECK (
  status = ANY (ARRAY['PENDING_APPROVAL'::po_status, 'ORDERED'::po_status, 'ACTIVE'::po_status])
  AND public.can_approve_supplier_po(id, auth.uid())
);

-- Supplier may manage line items only while its own PO is still a draft
DROP POLICY IF EXISTS "Supplier can insert line items on own draft PO" ON public.po_line_items;
CREATE POLICY "Supplier can insert line items on own draft PO"
ON public.po_line_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
     WHERE po.id = po_line_items.po_id
       AND po.status = 'ACTIVE'::po_status
       AND public.is_supplier_raised_po(po.id)
       AND public.user_in_org(auth.uid(), po.organization_id)
  )
);

DROP POLICY IF EXISTS "Supplier can update line items on own draft PO" ON public.po_line_items;
CREATE POLICY "Supplier can update line items on own draft PO"
ON public.po_line_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
     WHERE po.id = po_line_items.po_id
       AND po.status = 'ACTIVE'::po_status
       AND public.is_supplier_raised_po(po.id)
       AND public.user_in_org(auth.uid(), po.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
     WHERE po.id = po_line_items.po_id
       AND po.status = 'ACTIVE'::po_status
       AND public.is_supplier_raised_po(po.id)
       AND public.user_in_org(auth.uid(), po.organization_id)
  )
);

DROP POLICY IF EXISTS "Supplier can delete line items on own draft PO" ON public.po_line_items;
CREATE POLICY "Supplier can delete line items on own draft PO"
ON public.po_line_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
     WHERE po.id = po_line_items.po_id
       AND po.status = 'ACTIVE'::po_status
       AND public.is_supplier_raised_po(po.id)
       AND public.user_in_org(auth.uid(), po.organization_id)
  )
);

-- Notifications for the supplier-raised approval loop
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'PO_PENDING_APPROVAL';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'PO_RETURNED';

CREATE OR REPLACE FUNCTION public.notify_supplier_po_pending_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _supplier_name text;
BEGIN
  IF NEW.status <> 'PENDING_APPROVAL'::po_status
     OR OLD.status = 'PENDING_APPROVAL'::po_status
     OR NEW.pricing_owner_org_id IS NULL
     OR NOT public.is_supplier_raised_po(NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT o.name INTO _supplier_name
    FROM suppliers s JOIN organizations o ON o.id = s.organization_id
   WHERE s.id = NEW.supplier_id;

  INSERT INTO notifications (recipient_org_id, type, title, body, entity_type, entity_id, action_url)
  VALUES (
    NEW.pricing_owner_org_id,
    'PO_PENDING_APPROVAL',
    'Purchase order needs your approval: ' || COALESCE(NEW.po_number, ''),
    COALESCE(_supplier_name, 'A supplier') || ' raised a purchase order of $' ||
      to_char(ROUND(COALESCE(NEW.po_total, 0)::numeric, 2), 'FM999,999,990.00') ||
      ' for your approval.',
    'PO',
    NEW.id,
    '/project/' || NEW.project_id || '?tab=purchase-orders&po=' || NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_supplier_po_pending_approval ON public.purchase_orders;
CREATE TRIGGER trg_notify_supplier_po_pending_approval
AFTER UPDATE OF status ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_supplier_po_pending_approval();

CREATE OR REPLACE FUNCTION public.notify_supplier_po_returned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status <> 'PENDING_APPROVAL'::po_status
     OR NEW.status <> 'ACTIVE'::po_status
     OR NOT public.is_supplier_raised_po(NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (recipient_org_id, type, title, body, entity_type, entity_id, action_url)
  VALUES (
    NEW.organization_id,
    'PO_RETURNED',
    'Purchase order returned: ' || COALESCE(NEW.po_number, ''),
    'Your purchase order "' || COALESCE(NEW.po_name, NEW.po_number, '') ||
      '" was sent back for revision.' ||
      CASE WHEN NEW.notes IS NOT NULL AND NEW.notes <> '' THEN ' Note: ' || NEW.notes ELSE '' END,
    'PO',
    NEW.id,
    '/project/' || NEW.project_id || '?tab=purchase-orders&po=' || NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_supplier_po_returned ON public.purchase_orders;
CREATE TRIGGER trg_notify_supplier_po_returned
AFTER UPDATE OF status ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_supplier_po_returned();

REVOKE ALL ON FUNCTION public.notify_supplier_po_pending_approval() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_supplier_po_returned() FROM PUBLIC, anon, authenticated;