/** Package-level name for a CO/WO, so the order is never named after only its first item. */
export function fallbackPackageTitle(items: { title?: string | null; location_hint?: string | null }[]): string {
  const titles = items.map(i => (i.title ?? '').trim()).filter(Boolean);
  if (titles.length === 0) return 'New change';
  const first = titles[0];
  if (titles.length === 1) return first.slice(0, 80);
  const more = titles.length - 1;
  const loc = items.find(i => i.location_hint?.trim())?.location_hint?.trim();
  const base = loc ? `${loc}: ${first}` : first;
  return `${base} (+ ${more} more ${more === 1 ? 'item' : 'items'})`.slice(0, 100);
}

export function cleanTitle(t: string): string {
  return t.replace(/\s+/g, ' ').trim().slice(0, 100);
}
