/**
 * Seeding rules for the labor entry form.
 *
 * Editing an existing entry must reproduce that entry's own numbers — the
 * company settings defaults apply to NEW entries only. Seed from the stored
 * base (pre-markup) figures so re-saving does not stack markup a second time.
 */

export interface StoredLaborEntry {
  hourly_rate?: number | null;
  base_hourly_rate?: number | null;
  lump_sum?: number | null;
  base_lump_sum?: number | null;
  markup_percent?: number | null;
}

export interface LaborSeed {
  rate: string;
  lumpSum: string;
  markup: string;
}

export interface SettingsDefaults {
  orgRate?: number | null;
  profileRate?: number | null;
  orgMarkup?: number | null;
  isTC?: boolean;
}

export function seedFromEntry(entry: StoredLaborEntry): LaborSeed {
  const rate = entry.base_hourly_rate ?? entry.hourly_rate;
  const lump = entry.base_lump_sum ?? entry.lump_sum;
  const markup = entry.markup_percent;
  return {
    rate: rate != null ? String(rate) : '',
    lumpSum: lump != null ? String(lump) : '',
    markup: markup != null && Number(markup) > 0 ? String(markup) : '',
  };
}

/** Defaults are only ever applied when creating a new entry. */
export function seedForNewEntry(defaults: SettingsDefaults): LaborSeed {
  const rate = defaults.orgRate || defaults.profileRate || null;
  return {
    rate: rate != null ? String(rate) : '',
    lumpSum: '',
    markup: defaults.isTC && defaults.orgMarkup ? String(defaults.orgMarkup) : '',
  };
}

/** Billable amount saved back to the DB from a base figure + markup percent. */
export function billableFromBase(base: number, markupPercent: number): number {
  return base + base * (markupPercent / 100);
}
