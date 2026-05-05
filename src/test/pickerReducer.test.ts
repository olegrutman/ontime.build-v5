import { describe, it, expect } from 'vitest';
import { pickerReducer } from '@/components/change-orders/picker-v3/usePickerState';
import { initialPickerState, blankItem } from '@/components/change-orders/picker-v3/types';
import type { PickerState, PickerAction } from '@/components/change-orders/picker-v3/types';

function state(role: 'GC' | 'TC' | 'FC' = 'TC'): PickerState {
  return initialPickerState(role);
}

function act(s: PickerState, action: PickerAction): PickerState {
  return pickerReducer(s, action);
}

describe('pickerReducer', () => {
  describe('SET_STEP', () => {
    it('updates step number', () => {
      const s = act(state(), { type: 'SET_STEP', step: 3 });
      expect(s.step).toBe(3);
    });
  });

  describe('SET_ROLE', () => {
    it('updates role', () => {
      const s = act(state('TC'), { type: 'SET_ROLE', role: 'GC' });
      expect(s.role).toBe('GC');
    });
  });

  describe('SET_LOCATION', () => {
    it('sets locations on current item', () => {
      const s = act(state(), { type: 'SET_LOCATION', locations: ['L1 · Kitchen', 'L2 · Bath'] });
      expect(s.items[0].locations).toEqual(['L1 · Kitchen', 'L2 · Bath']);
    });
  });

  describe('TOGGLE_MULTI_LOCATION', () => {
    it('toggles multiLocation flag on', () => {
      const s = act(state(), { type: 'TOGGLE_MULTI_LOCATION' });
      expect(s.items[0].multiLocation).toBe(true);
    });

    it('trims to single location when toggling off with multiple locations', () => {
      let s = state();
      s = act(s, { type: 'SET_LOCATION', locations: ['A', 'B', 'C'] });
      s = act(s, { type: 'TOGGLE_MULTI_LOCATION' }); // on
      expect(s.items[0].multiLocation).toBe(true);
      expect(s.items[0].locations).toEqual(['A', 'B', 'C']);
      s = act(s, { type: 'TOGGLE_MULTI_LOCATION' }); // off
      expect(s.items[0].multiLocation).toBe(false);
      expect(s.items[0].locations).toEqual(['A']);
    });
  });

  describe('SET_SYSTEM', () => {
    it('sets system id and name', () => {
      const s = act(state(), { type: 'SET_SYSTEM', systemId: 'framing', systemName: 'Framing' });
      expect(s.items[0].system).toBe('framing');
      expect(s.items[0].systemName).toBe('Framing');
    });

    it('clears work types and narrative on system change', () => {
      let s = state();
      s = act(s, { type: 'TOGGLE_WORK_TYPE', workTypeId: 'w1', workTypeName: 'Work 1' });
      s = act(s, { type: 'SET_NARRATIVE', narrative: 'Some scope text' });
      expect(s.items[0].workTypes.size).toBe(1);
      expect(s.items[0].narrative).toBe('Some scope text');
      s = act(s, { type: 'SET_SYSTEM', systemId: 'wall', systemName: 'Wall System' });
      expect(s.items[0].workTypes.size).toBe(0);
      expect(s.items[0].narrative).toBe('');
    });
  });

  describe('SET_CAUSE', () => {
    it('sets all cause fields', () => {
      const s = act(state(), {
        type: 'SET_CAUSE',
        causeId: 'c1',
        causeName: 'Rework',
        docType: 'WO',
        billable: 'maybe',
        reason: 'rework',
      });
      expect(s.items[0].causeId).toBe('c1');
      expect(s.items[0].causeName).toBe('Rework');
      expect(s.items[0].docType).toBe('WO');
      expect(s.items[0].billable).toBe('maybe');
      expect(s.items[0].reason).toBe('rework');
    });
  });

  describe('SET_PRICING', () => {
    it('sets pricing type and name', () => {
      const s = act(state(), { type: 'SET_PRICING', pricingType: 'tm', pricingName: 'Time & Material' });
      expect(s.items[0].pricingType).toBe('tm');
      expect(s.items[0].pricingName).toBe('Time & Material');
    });
  });

  describe('TOGGLE_WORK_TYPE', () => {
    it('adds a work type', () => {
      const s = act(state(), { type: 'TOGGLE_WORK_TYPE', workTypeId: 'framing', workTypeName: 'Framing' });
      expect(s.items[0].workTypes.has('framing')).toBe(true);
      expect(s.items[0].workNames['framing']).toBe('Framing');
    });

    it('removes an existing work type on second toggle', () => {
      let s = act(state(), { type: 'TOGGLE_WORK_TYPE', workTypeId: 'framing', workTypeName: 'Framing' });
      s = act(s, { type: 'TOGGLE_WORK_TYPE', workTypeId: 'framing', workTypeName: 'Framing' });
      expect(s.items[0].workTypes.has('framing')).toBe(false);
      expect(s.items[0].workNames['framing']).toBeUndefined();
    });
  });

  describe('SET_NARRATIVE', () => {
    it('updates narrative', () => {
      const s = act(state(), { type: 'SET_NARRATIVE', narrative: 'Replace damaged header' });
      expect(s.items[0].narrative).toBe('Replace damaged header');
    });
  });

  describe('needs flags', () => {
    it('SET_MATERIALS_NEEDED', () => {
      const s = act(state(), { type: 'SET_MATERIALS_NEEDED', value: true });
      expect(s.items[0].materialsNeeded).toBe(true);
    });

    it('SET_EQUIPMENT_NEEDED', () => {
      const s = act(state(), { type: 'SET_EQUIPMENT_NEEDED', value: true });
      expect(s.items[0].equipmentNeeded).toBe(true);
    });
  });

  describe('responsibility', () => {
    it('SET_MATERIAL_RESPONSIBLE', () => {
      const s = act(state(), { type: 'SET_MATERIAL_RESPONSIBLE', value: 'GC' });
      expect(s.items[0].materialResponsible).toBe('GC');
    });

    it('SET_EQUIPMENT_RESPONSIBLE', () => {
      const s = act(state(), { type: 'SET_EQUIPMENT_RESPONSIBLE', value: 'GC' });
      expect(s.items[0].equipmentResponsible).toBe('GC');
    });
  });

  describe('collaboration', () => {
    it('SET_ASSIGNED_TC', () => {
      const s = act(state(), { type: 'SET_ASSIGNED_TC', orgId: 'org-123' });
      expect(s.collaboration.assignedTcOrgId).toBe('org-123');
    });

    it('SET_REQUEST_FC', () => {
      const s = act(state(), { type: 'SET_REQUEST_FC', value: true });
      expect(s.collaboration.requestFcInput).toBe(true);
    });

    it('SET_ASSIGNED_FC', () => {
      const s = act(state(), { type: 'SET_ASSIGNED_FC', orgId: 'fc-456' });
      expect(s.collaboration.assignedFcOrgId).toBe('fc-456');
    });
  });

  describe('multi-item management', () => {
    it('ADD_ITEM inherits shared fields and resets step', () => {
      let s = state();
      s = act(s, { type: 'SET_CAUSE', causeId: 'c1', causeName: 'Rework', docType: 'WO', billable: 'no', reason: 'rework' });
      s = act(s, { type: 'ADD_ITEM' });
      expect(s.items).toHaveLength(2);
      expect(s.currentItemIndex).toBe(1);
      expect(s.step).toBe(1);
      // Inherited fields
      expect(s.items[1].causeId).toBe('c1');
      expect(s.items[1].reason).toBe('rework');
      // Non-inherited fields should be blank
      expect(s.items[1].locations).toEqual([]);
      expect(s.items[1].narrative).toBe('');
    });

    it('SWITCH_ITEM changes current index', () => {
      let s = state();
      s = act(s, { type: 'ADD_ITEM' });
      s = act(s, { type: 'SWITCH_ITEM', index: 0 });
      expect(s.currentItemIndex).toBe(0);
    });

    it('DELETE_ITEM removes item and adjusts index', () => {
      let s = state();
      s = act(s, { type: 'ADD_ITEM' });
      s = act(s, { type: 'ADD_ITEM' });
      expect(s.items).toHaveLength(3);
      s = act(s, { type: 'DELETE_ITEM', index: 1 });
      expect(s.items).toHaveLength(2);
    });

    it('DELETE_ITEM does nothing with single item', () => {
      const s = act(state(), { type: 'DELETE_ITEM', index: 0 });
      expect(s.items).toHaveLength(1);
    });
  });

  describe('SET_SUBMITTED', () => {
    it('sets submitted flag', () => {
      const s = act(state(), { type: 'SET_SUBMITTED' });
      expect(s.submitted).toBe(true);
    });
  });

  describe('SET_LINKED_RFI', () => {
    it('stores RFI id', () => {
      const s = act(state(), { type: 'SET_LINKED_RFI', rfiId: 'rfi-abc' });
      expect(s.linkedRfiId).toBe('rfi-abc');
    });

    it('clears RFI id with null', () => {
      let s = act(state(), { type: 'SET_LINKED_RFI', rfiId: 'rfi-abc' });
      s = act(s, { type: 'SET_LINKED_RFI', rfiId: null });
      expect(s.linkedRfiId).toBeNull();
    });
  });
});
