import { describe, it, expect } from 'vitest';
import { fallbackPackageTitle } from '@/lib/coTitle';

describe('fallbackPackageTitle', () => {
  it('single item uses its name', () => {
    expect(fallbackPackageTitle([{ title: 'Install header' }])).toBe('Install header');
  });
  it('multiple items show location and count instead of only the first item', () => {
    expect(fallbackPackageTitle([
      { title: 'Wall layout adjustment', location_hint: 'Framing' },
      { title: 'a' }, { title: 'b' }, { title: 'c' },
    ])).toBe('Framing: Wall layout adjustment (+ 3 more items)');
  });
});
