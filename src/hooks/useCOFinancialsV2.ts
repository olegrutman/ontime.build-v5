import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoV4Flag } from "./useCoV4Flag";

/**
 * Phase 1 visibility-wall reader. When the org has `co_v4` enabled, this hook
 * pulls CO pricing data from the role-scoped views (which automatically mask
 * cost / markup / budget columns the viewer's role isn't allowed to see).
 *
 * When the flag is OFF it falls back to the existing base-table reads so
 * legacy code paths keep working unchanged.
 */
export function useCOFinancialsV2(coId: string | undefined | null) {
  const { enabled: coV4Enabled } = useCoV4Flag();

  return useQuery({
    enabled: !!coId,
    queryKey: ["co-financials-v2", coId, coV4Enabled],
    queryFn: async () => {
      if (!coId) return null;

      const co = coV4Enabled ? "change_orders_role_view" : "change_orders";
      const labor = coV4Enabled ? "co_labor_entries_role_view" : "co_labor_entries";
      const mats = coV4Enabled ? "co_material_items_role_view" : "co_material_items";
      const eq = coV4Enabled ? "co_equipment_items_role_view" : "co_equipment_items";

      const [header, laborRows, matRows, eqRows] = await Promise.all([
        supabase.from(co as any).select("*").eq("id", coId).maybeSingle(),
        supabase.from(labor as any).select("*").eq("co_id", coId),
        supabase.from(mats as any).select("*").eq("co_id", coId),
        supabase.from(eq as any).select("*").eq("co_id", coId),
      ]);

      return {
        header: header.data,
        labor: laborRows.data ?? [],
        materials: matRows.data ?? [],
        equipment: eqRows.data ?? [],
        // null columns in any of these arrays mean "masked by the visibility wall"
        usedRoleViews: coV4Enabled,
      };
    },
  });
}
