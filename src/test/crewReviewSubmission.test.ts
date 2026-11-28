import { describe, expect, it } from 'vitest';
import { crewReviewSubmission } from '@/lib/crewHourReview';

describe('single crew pricing review', () => {
  it('blocks submission until every entry is decided', () => {
    expect(crewReviewSubmission(['a', 'b'], { a: { decision: 'approved' } }).error).toMatch(/Decide 1 more entry/);
  });
  it('requires a reason for every rejection', () => {
    expect(crewReviewSubmission(['a'], { a: { decision: 'rejected', note: ' ' } }).error).toBe('Explain why these crew hours are rejected.');
  });
  it('submits all decisions together', () => {
    const r = crewReviewSubmission(['a', 'b'], { a: { decision: 'approved' }, b: { decision: 'rejected', note: 'Wrong date' } });
    expect(r.error).toBeNull();
    expect(r.decisions).toEqual([
      { id: 'a', decision: 'approved', note: null },
      { id: 'b', decision: 'rejected', note: 'Wrong date' },
    ]);
  });
});
