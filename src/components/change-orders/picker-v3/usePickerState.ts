import { useReducer } from 'react';
import type { PickerState, PickerAction, PickerItem } from './types';
import { blankItem, initialPickerState } from './types';
import type { COCreatedByRole } from '@/types/changeOrder';

export function pickerReducer(state: PickerState, action: PickerAction): PickerState {
  const cur = state.items[state.currentItemIndex];

  function updateItem(patch: Partial<PickerItem>): PickerState {
    const items = [...state.items];
    items[state.currentItemIndex] = { ...cur, ...patch };
    return { ...state, items };
  }

  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };

    case 'SET_ROLE':
      return { ...state, role: action.role };

    case 'SET_LOCATION':
      return updateItem({ locations: action.locations });

    case 'TOGGLE_MULTI_LOCATION': {
      const multi = !cur.multiLocation;
      const locs = !multi && cur.locations.length > 1 ? [cur.locations[0]] : cur.locations;
      return updateItem({ multiLocation: multi, locations: locs });
    }

    case 'SET_SYSTEM':
      return updateItem({
        system: action.systemId,
        systemName: action.systemName,
        workTypes: new Set<string>(),
        workNames: {},
        narrative: '',
      });

    case 'SET_CAUSE':
      return updateItem({
        causeId: action.causeId,
        causeName: action.causeName,
        docType: action.docType,
        billable: action.billable,
        reason: action.reason,
      });

    case 'SET_PRICING':
      return updateItem({ pricingType: action.pricingType, pricingName: action.pricingName });

    case 'TOGGLE_WORK_TYPE': {
      const wt = new Set(cur.workTypes);
      const wn = { ...cur.workNames };
      if (wt.has(action.workTypeId)) {
        wt.delete(action.workTypeId);
        delete wn[action.workTypeId];
      } else {
        wt.add(action.workTypeId);
        wn[action.workTypeId] = action.workTypeName;
      }
      return updateItem({ workTypes: wt, workNames: wn });
    }

    case 'SET_NARRATIVE':
      return updateItem({ narrative: action.narrative });

    case 'SET_TONE':
      return updateItem({ tone: action.tone });

    case 'SET_MATERIALS_NEEDED':
      return updateItem({ materialsNeeded: action.value });

    case 'SET_EQUIPMENT_NEEDED':
      return updateItem({ equipmentNeeded: action.value });

    case 'SET_MATERIAL_RESPONSIBLE':
      return updateItem({ materialResponsible: action.value });

    case 'SET_EQUIPMENT_RESPONSIBLE':
      return updateItem({ equipmentResponsible: action.value });

    case 'SET_ASSIGNED_TC':
      return { ...state, collaboration: { ...state.collaboration, assignedTcOrgId: action.orgId } };

    case 'SET_REQUEST_FC':
      return { ...state, collaboration: { ...state.collaboration, requestFcInput: action.value } };

    case 'SET_ASSIGNED_FC':
      return { ...state, collaboration: { ...state.collaboration, assignedFcOrgId: action.orgId } };

    case 'ADD_ITEM': {
      const newItem = blankItem();
      // inherit shared fields from current item
      newItem.causeId = cur.causeId;
      newItem.causeName = cur.causeName;
      newItem.docType = cur.docType;
      newItem.billable = cur.billable;
      newItem.reason = cur.reason;
      newItem.pricingType = cur.pricingType;
      newItem.pricingName = cur.pricingName;
      newItem.tone = cur.tone;
      return {
        ...state,
        items: [...state.items, newItem],
        currentItemIndex: state.items.length,
        step: 1,
      };
    }

    case 'SWITCH_ITEM':
      return { ...state, currentItemIndex: action.index, step: 1 };

    case 'DELETE_ITEM': {
      if (state.items.length <= 1) return state;
      const items = state.items.filter((_, i) => i !== action.index);
      const idx = state.currentItemIndex >= items.length ? items.length - 1 : state.currentItemIndex;
      return { ...state, items, currentItemIndex: idx };
    }

    case 'SET_SUBMITTED':
      return { ...state, submitted: true };

    case 'SET_LINKED_RFI':
      return { ...state, linkedRfiId: action.rfiId };

    default:
      return state;
  }
}

export function usePickerState(role: COCreatedByRole) {
  return useReducer(pickerReducer, role, initialPickerState);
}
