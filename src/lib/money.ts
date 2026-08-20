/**
 * Canonical money parsing helpers.
 *
 * ALWAYS use these when turning user input or formatted currency strings back
 * into numbers. Never use `parseInt(v.replace(/[^0-9]/g, ''))` — stripping the
 * decimal point silently multiplies the value by 10/100 (e.g. "813,367.50"
 * became 8,133,675 and cascaded into $8M contract headlines and -481% margins).
 */

/** Parse a money string without dropping cents ("$813,367.50" -> 813367.5). Handles negatives. */
export function parseMoney(v: string | number | null | undefined): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  const raw = String(v).trim();
  const negative = /^\(.*\)$/.test(raw) || raw.startsWith('-');
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
}

/** Parse a percentage input ("12.5%" -> 12.5). */
export function parsePercent(v: string | number | null | undefined): number {
  return parseMoney(v);
}

/** Round to cents to avoid float drift when summing ledgers. */
export function toCents(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}
