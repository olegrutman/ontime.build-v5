import { supabase } from '@/integrations/supabase/client';

/** The company that pays for an order's materials: the side the project contract names, else the ordering company. */
export async function resolvePoPricingOwner(projectId: string | null | undefined, fallbackOrgId: string): Promise<string> {
  if (!projectId) return fallbackOrgId;
  const { data } = await (supabase as any).from('project_contracts').select('material_responsibility, from_org_id, to_org_id')
    .eq('project_id', projectId).not('material_responsibility', 'is', null);
  const mr = (data || []).find((c: any) => c.material_responsibility);
  if (!mr) return fallbackOrgId;
  return (mr.material_responsibility === 'GC' ? mr.to_org_id : mr.from_org_id) || fallbackOrgId;
}
