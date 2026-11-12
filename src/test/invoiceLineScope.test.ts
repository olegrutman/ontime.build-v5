import { describe, expect, it } from 'vitest';
import {
  getInvoiceLineScopeText,
  hasInvoiceLineScopeText,
} from '@/lib/invoiceLineScope';

describe('invoice "Show full scope" switch', () => {
  const line = {
    description: 'CO-0005 · Relocate master bathroom partition wall',
    line_notes:
      'Demolish existing framing and reconstruct the partition wall to the new specified dimensions.',
  };

  it('shows only the line title when the switch is off', () => {
    expect(getInvoiceLineScopeText(line, false)).toBeNull();
  });

  it('shows the item write-up when the switch is on', () => {
    expect(getInvoiceLineScopeText(line, true)).toBe(line.line_notes);
  });

  it('shows nothing extra when the write-up merely repeats the title', () => {
    expect(
      getInvoiceLineScopeText({ description: 'Paint walls', line_notes: '  Paint walls  ' }, true),
    ).toBeNull();
  });

  it('shows nothing extra when the line has no write-up', () => {
    expect(getInvoiceLineScopeText({ description: 'Paint walls', line_notes: null }, true)).toBeNull();
  });

  it('hides the switch when no line has a write-up to reveal', () => {
    expect(
      hasInvoiceLineScopeText([
        { description: 'Paint walls', line_notes: 'Paint walls' },
        { description: 'Prime trim', line_notes: null },
      ]),
    ).toBe(false);
    expect(hasInvoiceLineScopeText([line])).toBe(true);
  });
});
