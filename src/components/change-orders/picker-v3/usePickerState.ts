import { useReducer } from 'react';
import type { PickerState, PickerAction, PickerItem } from './types';
import { blankItem, initialPickerState, isCauseAllowedForSystem } from './types';
import { LOCATION_SYSTEMS } from './catalog';
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

    case 'SET_LOCATION': {
      // If the new location types no longer support the chosen system, clear it
      // (and any scope picks that depend on it) so the cascade stays honest.
      const allowed = new Set<string>();
      for (const t of action.locationTypes) {
        for (const s of LOCATION_SYSTEMS[t] ?? []) allowed.add(s);
      }
      const keepSystem = cur.system && allowed.has(cur.system);
      return updateItem({
        locations: action.locations,
        locationTypes: action.locationTypes,
        ...(keepSystem ? {} : { system: null, systemName: null, workTypes: new Set<string>(), workNames: {}, narrative: '' }),
      });
    }

    case 'TOGGLE_MULTI_LOCATION': {
      const multi = !cur.multiLocation;
      const locs = !multi && cur.locations.length > 1 ? [cur.locations[0]] : cur.locations;
      const types = !multi && cur.locationTypes.length > 1 ? [cur.locationTypes[0]] : cur.locationTypes;
      return updateItem({ multiLocation: multi, locations: locs, locationTypes: types });
    }

    case 'SET_SYSTEM': {
      const keepCause = isCauseAllowedForSystem(cur.causeId, action.systemId);
      return updateItem({
        system: action.systemId,
        systemName: action.systemName,
        workTypes: new Set<string>(),
        workNames: {},
        narrative: '',
        ...(keepCause ? {} : {
          causeId: null,
          causeName: null,
          reason: null,
        }),
      });
    }

    case 'SET_SYSTEM_KEEP_ITEMS': {
      // Like SET_SYSTEM but preserves the user's already-selected work types.
      // Used by the Step 2 mismatch banner when we swap the system label to
      // match the items they picked (instead of throwing the items away).
      const keepCause = isCauseAllowedForSystem(cur.causeId, action.systemId);
      return updateItem({
        system: action.systemId,
        systemName: action.systemName,
        ...(keepCause ? {} : { causeId: null, causeName: null, reason: null }),
      });
    }



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
