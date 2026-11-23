import type { SashaGuideAction } from '@/types/sashaGuide';

export const SASHA_GUIDE_ACTION_EVENT = 'sasha:action';

/** Emit only after the user's real action succeeds; failed saves must not advance a tour. */
export function emitSashaGuideAction(action: SashaGuideAction) {
  window.dispatchEvent(new CustomEvent<SashaGuideAction>(SASHA_GUIDE_ACTION_EVENT, { detail: action }));
}
