ALTER TABLE public.field_report_items
  ADD COLUMN catalog_item_id uuid REFERENCES public.catalog_items(id),
  ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id);

CREATE INDEX field_report_items_catalog_item_idx ON public.field_report_items(catalog_item_id);
CREATE INDEX field_report_items_supplier_idx ON public.field_report_items(supplier_id);

CREATE OR REPLACE FUNCTION public.validate_field_material_selection()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  c public.catalog_items;
  s public.suppliers;
  ctx jsonb;
  mode text;
  notes text;
  length_value numeric;
BEGIN
  IF NEW.catalog_item_id IS NULL THEN
    IF NEW.supplier_id IS NOT NULL THEN
      RAISE EXCEPTION 'Choose a catalog product with its supplier';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.kind <> 'material' THEN
    RAISE EXCEPTION 'Only material requests can use catalog products';
  END IF;
  IF NEW.supplier_id IS NULL THEN
    RAISE EXCEPTION 'Choose the product supplier';
  END IF;
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Material quantity must be greater than zero';
  END IF;

  SELECT * INTO c FROM public.catalog_items
    WHERE id = NEW.catalog_item_id AND supplier_id = NEW.supplier_id AND is_active = true;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'The selected catalog product is not active for this supplier';
  END IF;
  SELECT * INTO s FROM public.suppliers WHERE id = NEW.supplier_id;
  IF s.id IS NULL OR (NOT s.is_system AND NOT EXISTS (
    SELECT 1 FROM public.project_team pt
    WHERE pt.project_id = NEW.project_id AND pt.org_id = s.organization_id AND pt.role = 'Supplier'
  )) THEN
    RAISE EXCEPTION 'Choose a supplier assigned to this project';
  END IF;
  IF NEW.unit IS NULL OR btrim(NEW.unit) = '' OR NEW.unit <> c.uom_default THEN
    RAISE EXCEPTION 'Material unit must match the selected catalog product';
  END IF;

  ctx := coalesce(NEW.material_context, '{}'::jsonb);
  mode := CASE WHEN ctx->>'unit_mode' = 'BUNDLE' THEN 'BUNDLE' ELSE 'EACH' END;
  notes := nullif(btrim(ctx->>'item_notes'), '');
  length_value := NULL;

  IF mode = 'BUNDLE' AND (c.bundle_qty IS NULL OR c.bundle_qty <= 0
      OR coalesce((ctx->>'bundle_count')::numeric, -1) <> c.bundle_qty) THEN
    RAISE EXCEPTION 'Package quantity does not match the selected catalog product';
  END IF;

  IF c.category = 'Engineered' AND c.uom_default = 'LF' THEN
    length_value := nullif(ctx->>'length_ft', '')::numeric;
    IF length_value IS NULL OR length_value <= 0 THEN
      RAISE EXCEPTION 'Enter a valid length for this engineered product';
    END IF;
  END IF;

  NEW.supplier_id := c.supplier_id;
  NEW.material_context := jsonb_strip_nulls(jsonb_build_object(
    'source', 'daily_report_picker',
    'catalog_item_id', c.id,
    'supplier_id', c.supplier_id,
    'sku', c.supplier_sku,
    'unit_mode', mode,
    'bundle_count', CASE WHEN mode = 'BUNDLE' THEN c.bundle_qty ELSE NULL END,
    'bundle_name', CASE WHEN mode = 'BUNDLE' THEN c.bundle_type ELSE NULL END,
    'length_ft', length_value,
    'computed_lf', CASE WHEN length_value IS NULL THEN NULL ELSE NEW.quantity * length_value END,
    'is_engineered', length_value IS NOT NULL,
    'item_notes', notes
  ));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_field_material_selection
BEFORE INSERT OR UPDATE ON public.field_report_items
FOR EACH ROW EXECUTE FUNCTION public.validate_field_material_selection();

CREATE OR REPLACE FUNCTION public.create_field_material_order(p_item_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i public.field_report_items;
  c public.catalog_items;
  s public.suppliers;
  contract_row public.project_contracts;
  supplier_id_value uuid;
  pricing_owner uuid;
  po_id_value uuid;
  po_number_value text;
  line_notes text;
  bundle_qty_value integer;
  length_value numeric;
  computed_lf_value numeric;
  has_project_supplier boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO i FROM public.field_report_items WHERE id = p_item_id FOR UPDATE;
  IF i.id IS NULL OR NOT public.user_in_org(auth.uid(), i.reviewer_org_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF i.converted_po_id IS NOT NULL THEN
    RETURN i.converted_po_id;
  END IF;
  IF i.kind <> 'material' OR i.status NOT IN ('crew_confirmed','reviewed','released','held') THEN
    RAISE EXCEPTION 'Item not ready';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.project_team pt
    WHERE pt.project_id = i.project_id AND pt.role = 'Supplier'
  ) INTO has_project_supplier;

  IF i.catalog_item_id IS NOT NULL THEN
    SELECT * INTO c FROM public.catalog_items
      WHERE id = i.catalog_item_id AND supplier_id = i.supplier_id AND is_active = true;
    IF c.id IS NULL THEN
      RAISE EXCEPTION 'The selected product is no longer active. Ask the crew to choose another product.';
    END IF;
    supplier_id_value := c.supplier_id;
  ELSE
    SELECT s0.id INTO supplier_id_value
    FROM public.project_team pt
    JOIN public.suppliers s0 ON s0.organization_id = pt.org_id
    WHERE pt.project_id = i.project_id AND pt.role = 'Supplier'
    LIMIT 1;
    IF supplier_id_value IS NULL THEN
      SELECT s0.id INTO supplier_id_value FROM public.suppliers s0 WHERE s0.is_system = true LIMIT 1;
    END IF;
  END IF;
  IF supplier_id_value IS NULL THEN RAISE EXCEPTION 'Add a supplier to this project first'; END IF;
  SELECT * INTO s FROM public.suppliers WHERE id = supplier_id_value;

  pricing_owner := i.reviewer_org_id;
  SELECT * INTO contract_row FROM public.project_contracts
    WHERE project_id = i.project_id AND material_responsibility IS NOT NULL LIMIT 1;
  IF contract_row.id IS NOT NULL THEN
    pricing_owner := coalesce(
      CASE WHEN contract_row.material_responsibility = 'GC' THEN contract_row.to_org_id ELSE contract_row.from_org_id END,
      i.reviewer_org_id
    );
  END IF;

  po_number_value := public.generate_po_number(i.reviewer_org_id);
  INSERT INTO public.purchase_orders (
    organization_id, created_by_org_id, pricing_owner_org_id, po_number, po_name,
    supplier_id, project_id, status, notes
  ) VALUES (
    i.reviewer_org_id, i.reviewer_org_id, pricing_owner, po_number_value,
    'Field request · ' || left(i.description, 60), supplier_id_value, i.project_id, 'ACTIVE',
    CASE WHEN s.is_system THEN
      'From crew field report. No supplier on this project yet — add one, then pick it with Edit before sending.'
    ELSE 'From crew field report. Not yet sent to the supplier.' END
  ) RETURNING id INTO po_id_value;

  line_notes := concat_ws(E'\n',
    CASE WHEN i.location IS NOT NULL AND btrim(i.location) <> '' THEN 'Location: ' || i.location END,
    CASE WHEN i.catalog_item_id IS NOT NULL THEN nullif(btrim(i.material_context->>'item_notes'), '') END
  );
  bundle_qty_value := CASE WHEN i.catalog_item_id IS NOT NULL AND i.material_context->>'unit_mode' = 'BUNDLE'
    THEN (i.material_context->>'bundle_count')::integer ELSE NULL END;
  length_value := CASE WHEN i.catalog_item_id IS NOT NULL THEN nullif(i.material_context->>'length_ft', '')::numeric ELSE NULL END;
  computed_lf_value := CASE WHEN i.catalog_item_id IS NOT NULL THEN nullif(i.material_context->>'computed_lf', '')::numeric ELSE NULL END;

  INSERT INTO public.po_line_items (
    po_id, line_number, supplier_sku, description, quantity, uom, pieces,
    length_ft, computed_lf, notes, unit_price, line_total, original_unit_price
  ) VALUES (
    po_id_value, 1, c.supplier_sku, i.description, coalesce(i.quantity, 1), coalesce(i.unit, 'EA'),
    bundle_qty_value, length_value, computed_lf_value, nullif(line_notes, ''), NULL, NULL, NULL
  );

  PERFORM set_config('app.field_rpc', 'on', true);
  UPDATE public.field_report_items SET
    status = 'converted', converted_po_id = po_id_value,
    reviewed_at = coalesce(reviewed_at, now()), reviewed_by = coalesce(reviewed_by, auth.uid()),
    released_at = coalesce(released_at, now()), released_by = coalesce(released_by, auth.uid())
  WHERE id = i.id;
  UPDATE public.field_reports SET status = 'reviewed'
  WHERE id = i.report_id AND status = 'submitted'
    AND NOT EXISTS (SELECT 1 FROM public.field_report_items
      WHERE report_id = i.report_id AND status IN ('draft','crew_confirmed'));
  PERFORM set_config('app.field_rpc', 'off', true);
  RETURN po_id_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.field_material_order_status(p_item_id uuid)
RETURNS TABLE(po_id uuid, status public.po_status, supplier_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT po.id, po.status, s.name
  FROM public.field_report_items i
  JOIN public.purchase_orders po ON po.id = i.converted_po_id
  JOIN public.suppliers s ON s.id = po.supplier_id
  WHERE i.id = p_item_id
    AND i.kind = 'material'
    AND (
      public.field_report_party(auth.uid(), i.report_id) IS NOT NULL
      OR (i.status IN ('released','converted') AND public.is_project_participant(auth.uid(), i.project_id) AND public.can_see_project(i.project_id))
    );
$$;

REVOKE ALL ON FUNCTION public.create_field_material_order(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.field_material_order_status(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_field_material_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.field_material_order_status(uuid) TO authenticated;