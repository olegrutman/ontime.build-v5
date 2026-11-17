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

/** Creates an unpriced draft material order for the project's supplier from a crew's material item. */
export async function createMaterialOrderFromItem(item: any): Promise<string> {
  const orgId = item.reviewer_org_id;
  const { data: team } = await db.from('project_team').select('org_id').eq('project_id', item.project_id).eq('role', 'Supplier');
  const orgIds = (team || []).map((t: any) => t.org_id);
  let supplierId: string | null = null;
  if (orgIds.length) supplierId = (await db.from('suppliers').select('id').in('organization_id', orgIds).limit(1).maybeSingle()).data?.id ?? null;
  // No supplier on the project: fall back to the Ontime Master Catalog, like the order form does.
  if (!supplierId) supplierId = (await db.from('suppliers').select('id').eq('is_system', true).limit(1).maybeSingle()).data?.id ?? null;
  if (!supplierId) throw new Error('Add a supplier to this project first');
  // Same payer rule as the order form: whoever the contract says handles materials.
  const { data: contracts } = await db.from('project_contracts').select('material_responsibility, from_org_id, to_org_id')
    .eq('project_id', item.project_id).not('material_responsibility', 'is', null);
  const mr = (contracts || []).find((c: any) => c.material_responsibility);
  const pricingOwnerOrgId = mr ? (mr.material_responsibility === 'GC' ? mr.to_org_id : mr.from_org_id) || orgId : orgId;
  const { data: poNumber, error: nErr } = await db.rpc('generate_po_number', { org_id: orgId });
  if (nErr || !poNumber) throw nErr || new Error('Could not number the order');
  const { data: po, error } = await db.from('purchase_orders').insert({
    organization_id: orgId, created_by_org_id: orgId, po_number: poNumber, po_name: `Field request · ${String(item.description).slice(0, 60)}`,
    supplier_id: supplierId, project_id: item.project_id, pricing_owner_org_id: pricingOwnerOrgId, status: 'ACTIVE', notes: orgIds.length ? 'From crew field report. Not yet sent to the supplier.' : FIELD_NO_SUPPLIER_NOTE,
  }).select('id').single();
  if (error) throw error;
  const { error: lErr } = await db.from('po_line_items').insert({
    po_id: po.id, line_number: 1, description: item.description, quantity: item.quantity ?? 1, uom: item.unit || 'EA',
    notes: item.location ? `Location: ${item.location}` : null,
  });
  if (lErr) { await db.from('purchase_orders').delete().eq('id', po.id); throw lErr; }
  try { await link(item.id, { po: po.id }); } catch (e) { await db.from('purchase_orders').delete().eq('id', po.id); throw e; }
  return po.id;
}

export const FIELD_NO_SUPPLIER_NOTE = 'From crew field report. No supplier on this project yet — add one, then pick it with Edit before sending.';
export const STAND_IN_SUPPLIER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
/** A field-report order still on the stand-in supplier must get a real supplier before it is sent. */
export function needsSupplierChoice(po: { notes?: string | null; supplier_id?: string | null } | null | undefined): boolean {
  return !!po && po.supplier_id === STAND_IN_SUPPLIER_ID && (po.notes ?? '').includes('No supplier on this project yet');
}
