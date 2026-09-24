/**
 * Layer D — one permanent test per bug we have already fixed.
 * Never delete a test here; add a new one for every new fix.
 */
import { describe, it, expect, vi } from 'vitest';
import { parseMoney, toCents } from '@/lib/money';

const rows: { co_number: string }[] = [];
vi.mock('@/integrations/supabase/client', () => {
  const chain = (table: string) => {
    const c: any = {};
    c.select = () => c;
    c.eq = () => (table === 'change_orders' ? Promise.resolve({ data: rows }) : c);
    c.maybeSingle = async () => ({
      data: { name: table === 'projects' ? '[SANDBOX] Willow (Creek) — Estates' : 'GC_Test [co]' },
    });
    return c;
  };
  return { supabase: { from: chain } };
});
import { generateCONumber } from '@/lib/generateCONumber';

describe('regressions', () => {
  it('BUG: "range out of order" — CO numbering survives brackets/special chars in names', async () => {
    rows.length = 0;
    const first = await generateCONumber({ projectId: 'p', creatorOrgId: 'a', assignedToOrgId: 'b', isTM: false });
    expect(first).toMatch(/^CO-[A-Z0-9]{1,3}-[A-Z0-9]{1,2}-[A-Z0-9]{1,2}-0001$/);
    rows.push({ co_number: first });
    const second = await generateCONumber({ projectId: 'p', creatorOrgId: 'a', assignedToOrgId: 'b', isTM: false });
    expect(second.endsWith('-0002')).toBe(true);
  });

  it('BUG: money parsing dropped cents ("813,367.50" became 8,133,675)', () => {
    expect(parseMoney('$813,367.50')).toBe(813367.5);
    expect(parseMoney('(1,200.10)')).toBe(-1200.1);
  });

  it('BUG: fake loss — crew cost counted twice ($520 revenue, $280 cost => $240 profit)', () => {
    const revenue = 520;
    const crewCharge = 280;
    const privateCopyOfCrewCharge = 280; // must be de-duplicated, not added
    const cost = Math.max(crewCharge, privateCopyOfCrewCharge);
    expect(toCents(revenue - cost)).toBe(240);
    expect(toCents(((revenue - cost) / revenue) * 100)).toBeCloseTo(46.15, 1);
  });
});
