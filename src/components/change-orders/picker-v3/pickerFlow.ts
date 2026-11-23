import type { PickerItem, PickerState } from './types';
import { PICKER_STEPS, REVIEW_STEP } from './types';

function scopeError(item: PickerItem): string | null {
  if (item.locations.length === 0) return 'Choose at least one location.';
  if (!item.system) return 'Choose a system.';
  if (item.workTypes.size === 0) return 'Choose at least one scope item.';
  if (!item.causeId) return 'Choose what caused the change.';
  return null;
}

export function pickerRoutingError(state: PickerState, hasUpstreamTarget: boolean): string | null {
  for (const item of state.items) {
    if (!item.pricingConfirmed) return 'Choose a pricing model for every item, even when keeping Fixed Price.';
  }
  if (state.role === 'GC' && !state.collaboration.assignedTcOrgId) {
    return 'Choose the Subcontractor who will receive this order.';
  }
  if (state.role !== 'GC' && !hasUpstreamTarget) {
    return state.role === 'FC'
      ? 'No Subcontractor is available to receive this Crew order.'
      : 'No General Contractor is available to receive this order.';
  }
  if (state.collaboration.requestFcInput && !state.collaboration.assignedFcOrgId) {
    return 'Choose the Crew company that will provide input.';
  }
  return null;
}

export function pickerStepError(state: PickerState, step: number, hasUpstreamTarget: boolean): string | null {
  const item = state.items[state.currentItemIndex];
  if (!item) return 'Add at least one item.';
  if (step <= 4) {
    const requiredByStep: Record<number, () => string | null> = {
      1: () => item.locations.length === 0 ? 'Choose at least one location.' : null,
      2: () => !item.system ? 'Choose a system.' : null,
      3: () => item.workTypes.size === 0 ? 'Choose at least one scope item.' : null,
      4: () => !item.causeId ? 'Choose what caused the change.' : null,
    };
    return requiredByStep[step]?.() ?? null;
  }
  if (step === 5) return pickerRoutingError(state, hasUpstreamTarget);
  if (step === REVIEW_STEP) {
    for (const candidate of state.items) {
      const error = scopeError(candidate);
      if (error) return error;
    }
    return pickerRoutingError(state, hasUpstreamTarget);
  }
  return null;
}

export function completedPickerSteps(state: PickerState, hasUpstreamTarget: boolean): Set<number> {
  const item = state.items[state.currentItemIndex];
  const done = new Set<number>();
  if (!item) return done;
  if (item.locations.length > 0) done.add(1);
  if (item.system) done.add(2);
  if (item.workTypes.size > 0) done.add(3);
  if (item.causeId) done.add(4);
  if (!pickerRoutingError(state, hasUpstreamTarget)) done.add(5);
  return done;
}

export const PICKER_STEP_COUNT = PICKER_STEPS.length;
