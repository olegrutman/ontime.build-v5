import { describe, it, expect } from 'vitest';
import { spendingTotals, crewBudgetComparison, crewLaborBreakdown, EMPTY_CREW_BUDGET } from '@/lib/crewTracker';

const entries = [
  { total_amount: 216, tracker_category: 'labor', tracker_pay_basis: 'hourly', cost_type: 'hours' },
  { total_amount: 1000, tracker_category: 'labor', tracker_pay_basis: 'unit', tracker_job_task_id: 't1', cost_type: 'lump_sum' },
  { total_amount: 300, tracker_category: null, cost_type: 'hours' },
  { total_amount: 120.5, tracker_category: 'Materials', cost_type: 'lump_sum' },
  { total_amount: 45.25, tracker_category: 'Fuel', cost_type: 'lump_sum' },
];

describe('crew KPI cards agree', () => {
  it('labor is the same on the tracker page, budget card and breakdown', () => {
    const page = spendingTotals(entries);
    const budget = crewBudgetComparison(entries, EMPTY_CREW_BUDGET);
    const split = crewLaborBreakdown(entries);
    expect(page.labor).toBe(1516);
    expect(budget.actual.labor).toBe(1516);
    expect(split.workers + split.hired).toBe(1516);
    expect(split.hired).toBe(1000);
  });
  it('total spent is counted once everywhere', () => {
    expect(spendingTotals(entries).total).toBe(1681.75);
    expect(crewBudgetComparison(entries, EMPTY_CREW_BUDGET).totalActual).toBe(1681.75);
  });
});
