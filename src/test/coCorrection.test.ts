import { describe, expect, it } from 'vitest';
import { correctionLabel, correctionNeedsAction, type OrderCorrection } from '@/lib/coCorrection';

const correction: OrderCorrection = { co_id: 'order', from_org_id: 'crew', to_org_id: 'subcontractor', version: 2, approved_version: 1, submitted_version: null, state: 'needs_correction', changed_at: '2026-10-27' };
describe('edited order correction flags', () => {
  it('flags modifications even without any price change', () => {
    expect(correctionLabel(correction)).not.toBeNull();
    expect(correctionNeedsAction(correction, 'crew')).toBe(true);
    expect(correctionNeedsAction(correction, 'subcontractor')).toBe(false);
  });
  it('routes submitted corrections to the contractual recipient', () => {
    const pending = { ...correction, state: 'pending', submitted_version: 2 };
    expect(correctionNeedsAction(pending, 'subcontractor')).toBe(true);
    expect(correctionNeedsAction(pending, 'crew')).toBe(false);
    expect(correctionNeedsAction(pending, 'general-contractor')).toBe(false);
  });
  it('clears only when the current edited version has been accepted', () => {
    expect(correctionLabel({ ...correction, approved_version: 2, state: 'clean' })).toBeNull();
    expect(correctionLabel({ ...correction, version: 3, approved_version: 2 })).not.toBeNull();
  });
});