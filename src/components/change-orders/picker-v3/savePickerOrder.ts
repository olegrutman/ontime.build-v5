import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { generateCONumber } from '@/lib/generateCONumber';
import type { COCreatedByRole } from '@/types/changeOrder';
import { buildLineRowsFromItem } from './buildLineRows';
import type { PickerItem, PickerState } from './types';

interface SavePickerOrderArgs {
  projectId: string;
  addToCoId?: string;
  state: PickerState;
  detectedRole: COCreatedByRole;
  orgId: string;
  assignedToOrgId: string | null;
  isTM: boolean;
}

function linePayload(item: PickerItem, firstSort: number, itemIndex: number) {
  return buildLineRowsFromItem(item, firstSort, itemIndex).map(row => ({
    item_name: row.item_name,
    description: row.description,
    unit: row.unit,
    sort_order: row.sort_order,
    location_tag: row.location_tag,
    reason: row.reason,
    task_phase: row.task_phase,
    group_key: row.group_key,
  }));
}

/** Saves the order, every scope line, Crew invitation and add-item activity in one database transaction. */
export async function savePickerOrder({
  projectId,
  addToCoId,
  state,
  detectedRole,
  orgId,
  assignedToOrgId,
  isTM,
}: SavePickerOrderArgs): Promise<string[]> {
  let orders: Json[];

  if (addToCoId) {
    orders = state.items.map((item, index) => {
      const lines = linePayload(item, 1, index);
      return {
        lines,
        materials_needed: item.materialsNeeded,
        equipment_needed: item.equipmentNeeded,
        materials_responsible: item.materialResponsible,
        equipment_responsible: item.equipmentResponsible,
      };
    });
  } else {
    orders = [];
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      const docType = item.docType === 'WO' || isTM ? 'WO' : 'CO';
      const coNumber = await generateCONumber({
        projectId,
        creatorOrgId: orgId,
        assignedToOrgId,
        isTM: docType === 'WO',
      });
      orders.push({
        co_number: coNumber,
        title: item.narrative
          ? item.narrative.substring(0, 120)
          : `${item.systemName ?? ''} · ${item.causeName ?? ''}`.trim() || coNumber,
        pricing_type: item.pricingType,
        document_type: docType,
        reason: item.reason ?? 'owner_request',
        reason_note: item.causeName ?? null,
        location_tag: item.locations.length > 0 ? item.locations.join(' + ') : null,
        assigned_to_org_id: assignedToOrgId,
        materials_needed: item.materialsNeeded,
        equipment_needed: item.equipmentNeeded,
        materials_responsible: item.materialResponsible,
        equipment_responsible: item.equipmentResponsible,
        blocked_by_rfi_id: state.linkedRfiId,
        collaboration_fc_org_id: state.collaboration.requestFcInput ? state.collaboration.assignedFcOrgId : null,
        lines: linePayload(item, 1, index),
      });
    }
  }

  const { data, error } = await supabase.rpc('save_picker_order', {
    _project_id: projectId,
    _existing_co_id: addToCoId ?? null,
    _orders: orders,
  });
  if (error) throw error;
  const ids = (data as { co_ids?: string[] } | null)?.co_ids ?? [];
  if (ids.length === 0) throw new Error('The order was not saved. Please try again.');
  return ids;
}
