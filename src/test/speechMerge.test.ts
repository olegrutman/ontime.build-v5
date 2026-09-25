import { describe, it, expect } from 'vitest';
import { mergeSegments } from '@/hooks/useSpeechRecognition';
describe('mergeSegments (phone voice doubling)', () => {
  it('handles Android cumulative results', () => {
    expect(mergeSegments(['fix wall', 'fix wall and add header', 'fix wall and add header at kitchen'])).toBe('fix wall and add header at kitchen');
  });
  it('drops exact repeats', () => {
    expect(mergeSegments(['reframe wall', 'reframe wall'])).toBe('reframe wall');
  });
  it('joins desktop-style separate phrases', () => {
    expect(mergeSegments(['reframe wall', 'add blocking'])).toBe('reframe wall add blocking');
  });
});
