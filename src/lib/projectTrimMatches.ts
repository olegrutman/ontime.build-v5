import { supabase } from "@/integrations/supabase/client";
import {
  rankProjectTrimMatches,
  type RankedTrimMatch,
  type TrimMatchCandidate,
  type TrimRequestHints,
} from "@/lib/trimMaterial";

const db = supabase as any;

type CatalogRow = {
  id: string;
  supplier_id: string;
  supplier_sku: string;
  name: string | null;
  description: string;
};

/**
 * Loads only project evidence visible to the current user, then resolves exact
 * catalog IDs or supplier-scoped SKUs against active items for this supplier.
 */
export async function loadProjectTrimMatches(
  projectId: string,
  supplierId: string,
  hints: TrimRequestHints,
): Promise<RankedTrimMatch[]> {
  const [{ data: supplier }, { data: orders, error: orderError }] = await Promise.all([
    db.from("suppliers").select("organization_id").eq("id", supplierId).maybeSingle(),
    db.from("purchase_orders")
      .select("id,created_at,line_items:po_line_items(supplier_sku,description)")
      .eq("project_id", projectId)
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (orderError) throw orderError;

  let estimates: any[] = [];
  // Never broaden an estimate query when the supplier organization is unknown.
  if (supplier?.organization_id) {
    const { data, error } = await db.from("supplier_estimates")
      .select("id,name,approved_at,items:supplier_estimate_items(id,catalog_item_id,supplier_sku,description,unit_price,pack_name)")
      .eq("project_id", projectId)
      .eq("supplier_org_id", supplier.organization_id)
      .eq("status", "APPROVED")
      .order("approved_at", { ascending: false })
      .limit(20);
    if (!error) estimates = data ?? [];
  }

  const orderLines = (orders ?? []).flatMap((order: any) =>
    (order.line_items ?? []).map((line: any) => ({ ...line, orderedAt: order.created_at })),
  );
  const estimateLines = estimates.flatMap((estimate) =>
    (estimate.items ?? []).map((item: any) => ({ ...item, estimateName: estimate.name })),
  );
  const skus = Array.from(new Set([
    ...orderLines.map((line: any) => line.supplier_sku),
    ...estimateLines.map((line: any) => line.supplier_sku),
  ].filter((sku): sku is string => typeof sku === "string" && !!sku.trim())));
  const catalogIds = Array.from(new Set(
    estimateLines.map((line: any) => line.catalog_item_id).filter(Boolean),
  ));

  const catalogRequests: Promise<{ data: CatalogRow[] | null; error: any }>[] = [];
  if (skus.length) {
    catalogRequests.push(db.from("catalog_items").select("id,supplier_id,supplier_sku,name,description")
      .eq("supplier_id", supplierId).eq("is_active", true).in("supplier_sku", skus));
  }
  if (catalogIds.length) {
    catalogRequests.push(db.from("catalog_items").select("id,supplier_id,supplier_sku,name,description")
      .eq("supplier_id", supplierId).eq("is_active", true).in("id", catalogIds));
  }
  const catalogResults = await Promise.all(catalogRequests);
  const catalogRows = catalogResults.flatMap((result) => result.data ?? []);
  const byId = new Map(catalogRows.map((item) => [item.id, item]));
  const bySku = new Map(catalogRows.map((item) => [item.supplier_sku, item]));
  const candidates: TrimMatchCandidate[] = [];

  for (const line of orderLines) {
    const catalog = bySku.get(line.supplier_sku);
    if (!catalog) continue;
    candidates.push({
      catalogItemId: catalog.id,
      supplierId,
      name: catalog.name || catalog.description,
      description: catalog.description,
      sku: catalog.supplier_sku,
      source: "project_order",
      sourceLabel: "Earlier project order",
      lastOrderedAt: line.orderedAt,
    });
  }

  for (const line of estimateLines) {
    const catalog = (line.catalog_item_id ? byId.get(line.catalog_item_id) : undefined)
      ?? bySku.get(line.supplier_sku);
    if (!catalog) continue;
    candidates.push({
      catalogItemId: catalog.id,
      supplierId,
      name: catalog.name || catalog.description,
      description: catalog.description,
      sku: catalog.supplier_sku,
      source: "project_estimate",
      sourceLabel: `Approved estimate${line.estimateName ? ` · ${line.estimateName}` : ""}`,
      estimateItemId: line.id,
      estimateUnitPrice: typeof line.unit_price === "number" ? line.unit_price : null,
      estimatePackName: line.pack_name || null,
    });
  }

  return rankProjectTrimMatches(candidates, hints, supplierId, 3);
}
