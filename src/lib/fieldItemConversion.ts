import { supabase } from '@/integrations/supabase/client';
import { generateCONumber } from '@/lib/generateCONumber';

const db = supabase as any;

/** Which conversion a field item offers, or null when none applies. */
export function conversionFor(item: { kind: string; status: string }): 'work_order' | 'material_order' | null {
  if (!['crew_confirmed', 'reviewed', 'released', 'held'].includes(item.status)) return null;
  if (item.kind === 'extra_work') return 'work_order';
  if (item.kind === 'material') return 'material_order';
  return null;
}

async function link(itemId: string, ids: { co?: string; po?: string }) {
  const { error } = await db.rpc('link_field_item_conversion', { p_item_id: itemId, p_co_id: ids.co ?? null, p_po_id: ids.po ?? null });
  if (error) throw error;
}

/** Creates an unpriced draft change/work order from a crew's extra-work item, then marks the item converted. */
export async function createWorkOrderFromItem(item: any, userId: string): Promise<string> {
  const orgId = item.reviewer_org_id;
  const [{ data: project }, { data: gc }] = await Promise.all([
    db.from('projects').select('contract_mode').eq('id', item.project_id).single(),
    db.from('project_participants').select('organization_id').eq('project_id', item.project_id).eq('role', 'GC').eq('invite_status', 'ACCEPTED').maybeSingle(),
  ]);
  const isTM = project?.contract_mode === 'tm';
  const assignedTo = gc?.organization_id ?? null;
  const coNumber = await generateCONumber({ projectId: item.project_id, creatorOrgId: orgId, assignedToOrgId: assignedTo, isTM });
  const title = String(item.description).slice(0, 120);
  const { data: co, error } = await db.from('change_orders').insert({
    org_id: orgId, project_id: item.project_id, created_by_user_id: userId, created_by_role: 'TC',
    co_number: coNumber, title, status: 'draft', pricing_type: 'fixed', document_type: isTM ? 'WO' : 'CO',
    reason: 'other', reason_note: 'From crew field report', location_tag: item.location || null,
    assigned_to_org_id: assignedTo, fc_input_needed: false, materials_needed: false, equipment_needed: false,
  }).select('id').single();
  if (error) throw error;
  const { error: liErr } = await db.from('co_line_items').insert({
    co_id: co.id, org_id: orgId, created_by_role: 'TC', item_name: title, description: item.description,
    unit: item.unit || 'EA', sort_order: 1, location_tag: item.location || null, reason: 'other',
  });
  if (liErr) { await db.from('change_orders').delete().eq('id', co.id); throw liErr; }
  try { await link(item.id, { co: co.id }); } catch (e) { await db.from('change_orders').delete().eq('id', co.id); throw e; }
  return co.id;
}

/** Creates one unpriced draft order and preserves the crew's exact catalog selection. */
export async function createMaterialOrderFromItem(item: any): Promise<string> {
  const { data, error } = await db.rpc('create_field_material_order', { p_item_id: item.id });
  if (error) throw error;
  if (!data) throw new Error('Could not create the material order');
  return data as string;
}

export const FIELD_NO_SUPPLIER_NOTE = 'From crew field report. No supplier on this project yet — add one, then pick it with Edit before sending.';
export const STAND_IN_SUPPLIER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
/** A field-report order still on the stand-in supplier must get a real supplier before it is sent. */
export function needsSupplierChoice(po: { notes?: string | null; supplier_id?: string | null } | null | undefined): boolean {
  return !!po && po.supplier_id === STAND_IN_SUPPLIER_ID && (po.notes ?? '').includes('No supplier on this project yet');
}
