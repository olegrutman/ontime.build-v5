import { describe, expect, it } from 'vitest';
import { blankItem, initialPickerState, REVIEW_STEP } from '@/components/change-orders/picker-v3/types';
import { completedPickerSteps, PICKER_STEP_COUNT, pickerRoutingError, pickerStepError } from '@/components/change-orders/picker-v3/pickerFlow';

function readyItem() {
  return {
    ...blankItem(),
    locations: ['North wall'],
    system: 'framing',
    workTypes: new Set(['blocking']),
    causeId: 'owner_request',
    pricingConfirmed: true,
  };
}

function readyState(role: 'GC' | 'TC' | 'FC' = 'TC') {
  return {
    ...initialPickerState(role),
    items: [readyItem()],
    collaboration: {
      assignedTcOrgId: role === 'GC' ? 'sub-1' : null,
      requestFcInput: false,
      assignedFcOrgId: null,
    },
  };
}

describe('six-step picker flow', () => {
  it('uses six steps with Review last', () => {
    expect(PICKER_STEP_COUNT).toBe(6);
    expect(REVIEW_STEP).toBe(6);
  });

  it('does not complete Routing from the untouched Fixed Price default', () => {
    const state = { ...readyState(), items: [{ ...readyItem(), pricingConfirmed: false }] };
    expect(pickerRoutingError(state, true)).toContain('Choose a pricing model');
    expect(completedPickerSteps(state, true).has(5)).toBe(false);
  });

  it('requires a General Contractor-created order to choose its Subcontractor', () => {
    const state = readyState('GC');
    state.collaboration.assignedTcOrgId = null;
    expect(pickerRoutingError(state, true)).toContain('Choose the Subcontractor');
  });

  it('requires a Crew order to have an upstream Subcontractor', () => {
    expect(pickerRoutingError(readyState('FC'), false)).toContain('No Subcontractor');
  });

  it('requires a Crew company when Crew input is requested', () => {
    const state = readyState();
    state.collaboration.requestFcInput = true;
    expect(pickerRoutingError(state, true)).toContain('Choose the Crew company');
  });

  it('allows Next from Cause and reaches Review only with complete routing', () => {
    const state = readyState();
    expect(pickerStepError(state, 4, true)).toBeNull();
    expect(pickerStepError(state, 5, true)).toBeNull();
    expect(pickerStepError(state, 6, true)).toBeNull();
    expect(completedPickerSteps(state, true).has(5)).toBe(true);
  });
});
