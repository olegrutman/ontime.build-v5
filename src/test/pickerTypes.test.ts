import { describe, it, expect } from 'vitest';
import {
  blankItem,
  initialPickerState,
  locationDisplay,
  locationShort,
  type PickerItem,
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
    expect(item.materialsNeeded).toBe(false);
    expect(item.equipmentNeeded).toBe(false);
    expect(item.materialResponsible).toBe('TC');
    expect(item.equipmentResponsible).toBe('TC');
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
