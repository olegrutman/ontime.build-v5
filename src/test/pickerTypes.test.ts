import { describe, it, expect } from 'vitest';
import {
  blankItem,
  initialPickerState,
  itemLaborTotal,
  itemMaterialTotal,
  itemEquipmentTotal,
  itemSubtotal,
  grandTotal,
  locationDisplay,
  locationShort,
  type PickerItem,
  type MaterialDraft,
  type EquipmentDraft,
} from '@/components/change-orders/picker-v3/types';

describe('blankItem', () => {
  it('returns correct defaults', () => {
    const item = blankItem();
    expect(item.locations).toEqual([]);
    expect(item.multiLocation).toBe(false);
    expect(item.system).toBeNull();
    expect(item.causeId).toBeNull();
    expect(item.docType).toBe('CO');
    expect(item.billable).toBe('yes');
    expect(item.pricingType).toBe('fixed');
    expect(item.markup).toBe(18);
    expect(item.materials).toEqual([]);
    expect(item.equipment).toEqual([]);
    expect(item.materialResponsible).toBe('TC');
    expect(item.equipmentResponsible).toBe('TC');
    expect(item.laborEntries).toHaveLength(2);
    expect(item.laborEntries[0].role).toBe('Lead Carpenter');
    expect(item.laborEntries[1].role).toBe('Carpenter');
  });
});

describe('initialPickerState', () => {
  it('sets role and creates one blank item', () => {
    const state = initialPickerState('TC');
    expect(state.role).toBe('TC');
    expect(state.step).toBe(1);
    expect(state.items).toHaveLength(1);
    expect(state.currentItemIndex).toBe(0);
    expect(state.submitted).toBe(false);
    expect(state.linkedRfiId).toBeNull();
    expect(state.collaboration.assignedTcOrgId).toBeNull();
    expect(state.collaboration.requestFcInput).toBe(false);
  });

  it('works with all roles', () => {
    expect(initialPickerState('GC').role).toBe('GC');
    expect(initialPickerState('FC').role).toBe('FC');
  });
});

describe('itemLaborTotal', () => {
  it('sums rate * hours for all entries', () => {
    const item = blankItem();
    item.laborEntries = [
      { role: 'Lead', rate: 72, hours: 8 },
      { role: 'Helper', rate: 60, hours: 4 },
    ];
    expect(itemLaborTotal(item)).toBe(72 * 8 + 60 * 4); // 576 + 240 = 816
  });

  it('returns 0 for zero hours', () => {
    const item = blankItem();
    expect(itemLaborTotal(item)).toBe(0);
  });
});

describe('itemMaterialTotal', () => {
  it('sums unitCost * quantity', () => {
    const item = blankItem();
    item.materials = [
      { tempId: '1', description: 'Lumber', sku: '', supplier: '', quantity: 10, unit: 'ea', unitCost: 25, icon: '' },
      { tempId: '2', description: 'Nails', sku: '', supplier: '', quantity: 100, unit: 'box', unitCost: 5, icon: '' },
    ] as MaterialDraft[];
    expect(itemMaterialTotal(item)).toBe(10 * 25 + 100 * 5); // 250 + 500 = 750
  });

  it('returns 0 for empty materials', () => {
    expect(itemMaterialTotal(blankItem())).toBe(0);
  });
});

describe('itemEquipmentTotal', () => {
  it('sums costs', () => {
    const item = blankItem();
    item.equipment = [
      { tempId: '1', description: 'Crane', supplier: '', durationNote: '1 day', cost: 500, icon: '' },
      { tempId: '2', description: 'Scaffold', supplier: '', durationNote: '1 week', cost: 300, icon: '' },
    ] as EquipmentDraft[];
    expect(itemEquipmentTotal(item)).toBe(800);
  });
});

describe('itemSubtotal', () => {
  it('applies markup to base total', () => {
    const item = blankItem();
    item.laborEntries = [{ role: 'Lead', rate: 100, hours: 10 }];
    item.markup = 20;
    // base = 1000, markup = 1.2 => 1200
    expect(itemSubtotal(item)).toBe(1200);
  });

  it('applies multi-location multiplier', () => {
    const item = blankItem();
    item.laborEntries = [{ role: 'Lead', rate: 100, hours: 10 }];
    item.markup = 0;
    item.multiLocation = true;
    item.locations = ['L1 · Kitchen', 'L1 · Bath', 'L2 · Bedroom'];
    // base = 1000, mult = 3, markup = 1.0 => 3000
    expect(itemSubtotal(item)).toBe(3000);
  });

  it('does not multiply for single location with multiLocation flag', () => {
    const item = blankItem();
    item.laborEntries = [{ role: 'Lead', rate: 100, hours: 10 }];
    item.markup = 0;
    item.multiLocation = true;
    item.locations = ['L1 · Kitchen'];
    // single location means multiplier = 1
    expect(itemSubtotal(item)).toBe(1000);
  });

  it('does not multiply when multiLocation is false', () => {
    const item = blankItem();
    item.laborEntries = [{ role: 'Lead', rate: 100, hours: 10 }];
    item.markup = 0;
    item.multiLocation = false;
    item.locations = ['L1 · Kitchen', 'L1 · Bath'];
    // multiLocation false => mult = 1
    expect(itemSubtotal(item)).toBe(1000);
  });
});

describe('grandTotal', () => {
  it('sums subtotals of multiple items', () => {
    const item1 = blankItem();
    item1.laborEntries = [{ role: 'A', rate: 100, hours: 10 }];
    item1.markup = 0;

    const item2 = blankItem();
    item2.laborEntries = [{ role: 'B', rate: 50, hours: 20 }];
    item2.markup = 0;

    expect(grandTotal([item1, item2])).toBe(2000);
  });

  it('returns 0 for empty array', () => {
    expect(grandTotal([])).toBe(0);
  });
});

describe('locationDisplay', () => {
  it('returns dash for no locations', () => {
    const item = blankItem();
    expect(locationDisplay(item)).toBe('—');
  });

  it('returns single location', () => {
    const item = blankItem();
    item.locations = ['Interior · L1 · Kitchen'];
    expect(locationDisplay(item)).toBe('Interior · L1 · Kitchen');
  });

  it('joins multiple locations', () => {
    const item = blankItem();
    item.locations = ['L1 · Kitchen', 'L1 · Bath'];
    expect(locationDisplay(item)).toBe('L1 · Kitchen, L1 · Bath');
  });
});

describe('locationShort', () => {
  it('returns "No location" for empty', () => {
    const item = blankItem();
    expect(locationShort(item)).toBe('No location');
  });

  it('returns location string for single', () => {
    const item = blankItem();
    item.locations = ['L1 · Kitchen'];
    expect(locationShort(item)).toBe('L1 · Kitchen');
  });

  it('returns count for multiple', () => {
    const item = blankItem();
    item.locations = ['A', 'B', 'C'];
    expect(locationShort(item)).toBe('3 locations');
  });
});
