CREATE POLICY "Supplier can schedule delivery"
ON public.purchase_orders
FOR UPDATE
USING (
  is_supplier_for_purchase_order(id)
  AND status = ANY (ARRAY['ORDERED'::po_status, 'READY_FOR_DELIVERY'::po_status])
)
WITH CHECK (
  is_supplier_for_purchase_order(id)
  AND status = ANY (ARRAY['ORDERED'::po_status, 'READY_FOR_DELIVERY'::po_status, 'DELIVERED'::po_status])
);