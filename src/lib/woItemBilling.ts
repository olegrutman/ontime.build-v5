const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Splits an order's approved value across its items. Items are weighted by their
 * priced labor; with no pricing evidence they share equally. The last item absorbs
 * rounding so item values always sum to exactly the order value.
 */
export function itemValues(orderValue: number, items: { id: string; weight: number }[]): Map<string, number> {
  const out = new Map<string, number>();
  if (items.length === 0) return out;
  const total = items.reduce((s, i) => s + Math.max(0, i.weight), 0);
  let used = 0;
  items.forEach((item, idx) => {
    if (idx === items.length - 1) { out.set(item.id, r2(orderValue - used)); return; }
    const share = total > 0 ? Math.max(0, item.weight) / total : 1 / items.length;
    const v = r2(orderValue * share);
    used = r2(used + v);
    out.set(item.id, v);
  });
  return out;
}

/** This period's amount for one item: pct of its value, never past its own remaining balance. */
export function itemProgressAmount(itemValue: number, pct: number, itemBilled: number): number {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  const remaining = Math.max(0, r2(itemValue - itemBilled));
  return r2(Math.min(remaining, r2(itemValue) * p / 100));
}

export const EXTRAS_KEY = (coId: string) => `${coId}::extras`;
