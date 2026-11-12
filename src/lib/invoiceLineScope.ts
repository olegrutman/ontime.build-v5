export interface InvoiceLineScopeSource {
  description?: string | null;
  line_notes?: string | null;
}

/**
 * Resolves what the "Show full scope" switch on an invoice line reveals.
 *
 * - switch off -> the line shows only its own title (the line description)
 * - switch on  -> the line also shows that item's full write-up (line_notes)
 *
 * The write-up is skipped when it is missing or when it merely repeats the
 * line title, so the switch never reveals an empty or duplicated block.
 */
export function getInvoiceLineScopeText(
  line: InvoiceLineScopeSource,
  showFullScope: boolean,
): string | null {
  if (!showFullScope) return null;
  const notes = (line.line_notes ?? '').trim();
  if (!notes) return null;
  const title = (line.description ?? '').trim();
  if (title && notes === title) return null;
  return notes;
}

/** True when at least one line carries a write-up worth revealing. */
export function hasInvoiceLineScopeText(lines: InvoiceLineScopeSource[]): boolean {
  return lines.some((line) => getInvoiceLineScopeText(line, true) !== null);
}
