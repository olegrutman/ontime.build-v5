import { describe, it, expect } from 'vitest';
import { getNavGroups } from '@/components/project/ProjectSidebar';

const VARIANTS: { name: string; isTM: boolean; isSupplier: boolean }[] = [
  { name: 'GC/TC/FC · fixed price', isTM: false, isSupplier: false },
  { name: 'GC/TC/FC · T&M', isTM: true, isSupplier: false },
  { name: 'Supplier · fixed price', isTM: false, isSupplier: true },
  { name: 'Supplier · T&M', isTM: true, isSupplier: true },
];

function flatten(isTM: boolean, isSupplier: boolean) {
  const { groups, more } = getNavGroups(isTM, isSupplier);
  return [...groups.flatMap((g) => g.items), ...more];
}

describe('project sidebar nav — all user types', () => {
  VARIANTS.forEach(({ name, isTM, isSupplier }) => {
    describe(name, () => {
      it('renders every destination exactly once (no pinned duplicates)', () => {
        const keys = flatten(isTM, isSupplier).map((i) => i.key);
        expect(new Set(keys).size).toBe(keys.length);
      });

      it('has unique routes', () => {
        const routes = flatten(isTM, isSupplier).map((i) => i.route);
        expect(new Set(routes).size).toBe(routes.length);
      });

      it('leads with an unlabeled primary block of 3 daily destinations', () => {
        const { groups } = getNavGroups(isTM, isSupplier);
        expect(groups[0].label).toBeUndefined();
        expect(groups[0].items).toHaveLength(3);
        expect(groups[0].items[0].key).toBe('overview');
      });

      it('uses at most 2 group headers', () => {
        const { groups } = getNavGroups(isTM, isSupplier);
        expect(groups.filter((g) => g.label).length).toBeLessThanOrEqual(2);
      });

      it('keeps the always-visible list to 8 rows or fewer', () => {
        const { groups } = getNavGroups(isTM, isSupplier);
        expect(groups.flatMap((g) => g.items).length).toBeLessThanOrEqual(8);
      });

      it('every item has a label, icon and route', () => {
        flatten(isTM, isSupplier).forEach((i) => {
          expect(i.label.length).toBeGreaterThan(0);
          expect(i.icon).toBeTruthy();
          expect(i.route.length).toBeGreaterThan(0);
        });
      });

      it('parks Settings and Project Info in the collapsed More drawer', () => {
        const { more } = getNavGroups(isTM, isSupplier);
        expect(more.map((i) => i.key)).toEqual(expect.arrayContaining(['settings', 'setup']));
      });
    });
  });

  it('T&M renames Change Orders to Work Orders and drops the SOV', () => {
    const tm = flatten(true, false);
    expect(tm.find((i) => i.key === 'change-orders')?.label).toBe('Work Orders');
    expect(tm.find((i) => i.key === 'sov')).toBeUndefined();

    const fixed = flatten(false, false);
    expect(fixed.find((i) => i.key === 'change-orders')?.label).toBe('Change Orders');
    expect(fixed.find((i) => i.key === 'sov')).toBeDefined();
  });

  it('suppliers lead with the estimate → PO loop and never see internal pages', () => {
    const { groups } = getNavGroups(false, true);
    expect(groups[0].items.map((i) => i.key)).toEqual(['overview', 'estimates', 'purchase-orders']);

    const keys = flatten(false, true).map((i) => i.key);
    ['change-orders', 'sov', 'backcharges', 'payment-apps', 'rfis', 'schedule', 'daily-log'].forEach(
      (hidden) => expect(keys).not.toContain(hidden)
    );
  });

  it('non-suppliers keep the field ops and long-tail pages', () => {
    const keys = flatten(false, false).map((i) => i.key);
    ['schedule', 'daily-log', 'rfis', 'backcharges', 'payment-apps', 'returns'].forEach((k) =>
      expect(keys).toContain(k)
    );
  });
});
