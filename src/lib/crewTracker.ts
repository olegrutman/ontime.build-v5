import { toCents } from '@/lib/money';
import type { ProjectLedger } from '@/lib/kpiLedger';

export const CREW_BUDGET_GROUPS = [
  { key: 'labor', label: 'Labor' },
  { key: 'materials', label: 'Materials & fasteners' },
  { key: 'tools_equipment', label: 'Tools & equipment' },
  { key: 'other', label: 'Other expenses' },
] as const;
export type CrewBudget = Record<typeof CREW_BUDGET_GROUPS[number]['key'], number>;
export const EMPTY_CREW_BUDGET: CrewBudget = { labor: 0, materials: 0, tools_equipment: 0, other: 0 };

export function crewDrawBalance(total: number, percent: number, paid: number) {
  const earned = toCents(total * Math.max(0, Math.min(100, percent)) / 100);
  return { earned, available: toCents(Math.max(0, earned - paid)), remaining: toCents(Math.max(0, total - paid)) };
}

/** One rule for every card: tracker labor, or legacy hour entries with no category. */
export function isCrewLabor(e: { tracker_category?: string | null; cost_type?: string | null }) {
  return e.tracker_category === 'labor' || (!e.tracker_category && e.cost_type === 'hours');
}

export function crewLaborBreakdown(entries: { total_amount: number; tracker_category?: string | null; cost_type?: string | null; tracker_job_task_id?: string | null; tracker_pay_basis?: string | null }[]) {
  const labor = entries.filter(isCrewLabor);
  const hired = toCents(labor.filter(e => e.tracker_job_task_id || ['sq_ft','unit'].includes(e.tracker_pay_basis ?? '')).reduce((s,e) => s + Number(e.total_amount),0));
  const total = toCents(labor.reduce((s,e) => s + Number(e.total_amount),0));
  return { workers: toCents(total - hired), hired };
}

export function crewBudgetComparison(entries: { total_amount: number; tracker_category?: string | null; cost_type?: string | null }[], budget: CrewBudget) {
  const actual = { ...EMPTY_CREW_BUDGET };
  for (const entry of entries) {
    const category = entry.tracker_category;
    const group = isCrewLabor(entry) ? 'labor'
      : category === 'Materials' || category === 'Nails & fasteners' ? 'materials'
      : category === 'Tools & blades' || category === 'Equipment rental' ? 'tools_equipment' : 'other';
    actual[group] = toCents(actual[group] + Number(entry.total_amount));
  }
  const totalBudget = toCents(CREW_BUDGET_GROUPS.reduce((sum, group) => sum + budget[group.key], 0));
  const totalActual = toCents(CREW_BUDGET_GROUPS.reduce((sum, group) => sum + actual[group.key], 0));
  const forecast = toCents(CREW_BUDGET_GROUPS.reduce((sum, group) => sum + Math.max(budget[group.key], actual[group.key]), 0));
  return { actual, totalBudget, totalActual, remaining: toCents(totalBudget - totalActual), forecast };
}

/** Budget is a forecast, never a second expense. Actual ledger entries count once. */
export function withCrewSpending(ledger: ProjectLedger, actual: number, forecast: number): ProjectLedger {
  const revisedCost = toCents(ledger.revisedCost.value + forecast);
  const earnedCost = toCents(ledger.earnedCost.value + actual);
  const forecastMargin = toCents(ledger.revisedContract.value - revisedCost);
  const marginToDate = toCents(ledger.billed.value - earnedCost);
  const forecastKnown = ledger.revisedContract.known && revisedCost > 0;
  const earnedKnown = ledger.billed.value > 0 && earnedCost > 0;
  return {
    ...ledger,
    revisedCost: { ...ledger.revisedCost, value: revisedCost, known: ledger.revisedCost.known || forecast > 0, formula: `${ledger.revisedCost.formula} + private crew spending forecast` },
    forecastMargin: { ...ledger.forecastMargin, value: forecastMargin, known: forecastKnown, formula: 'Revised revenue − forecast costs, including your crew budget' },
    forecastMarginPct: forecastKnown && ledger.revisedContract.value > 0 ? forecastMargin / ledger.revisedContract.value * 100 : 0,
    earnedCost: { ...ledger.earnedCost, value: earnedCost, known: earnedCost > 0, formula: 'Invoices billed to you + logged internal labor + Crew Tracker labor and expenses' },
    marginToDate: { ...ledger.marginToDate, value: marginToDate, known: earnedKnown, formula: 'Billed revenue − actual costs, including Crew Tracker spending' },
    marginToDatePct: ledger.billed.value > 0 ? marginToDate / ledger.billed.value * 100 : 0,
    marginToDateMeaningful: earnedKnown,
  };
}

export type PayBasis = 'hourly' | 'daily' | 'sq_ft' | 'unit';
export const PAY_BASIS: Record<PayBasis, { label: string; rateLabel: string; per: string; qty: string; presets: number[]; step: string }> = {
  hourly: { label: 'Hourly', rateLabel: 'Hourly rate', per: 'hour', qty: 'Hours', presets: [4, 8, 10], step: '0.25' },
  daily: { label: 'Per day', rateLabel: 'Daily rate', per: 'day', qty: 'Days', presets: [0.5, 1], step: '0.25' },
  sq_ft: { label: 'Per sq. ft (labor crew)', rateLabel: 'Price per sq. ft', per: 'sq. ft', qty: 'Sq. ft', presets: [], step: '0.01' },
  unit: { label: 'Per unit (labor crew)', rateLabel: 'Price per unit', per: 'unit', qty: 'Units', presets: [], step: '1' },
};
export function payBasisInfo(basis: string | null | undefined) { return PAY_BASIS[basis as PayBasis] ?? PAY_BASIS.hourly; }
export function presetLabel(basis: string, q: number) { return basis === 'hourly' ? `${q} hrs` : q === 1 ? 'Full day' : 'Half day'; }
export const EXPENSE_CATEGORIES = ['Nails & fasteners', 'Tools & blades', 'Equipment rental', 'Fuel', 'Materials', 'Disposal', 'Travel', 'Other'];
export function crewPay(rate: number, quantity: number): number {
  if (!Number.isFinite(rate) || !Number.isFinite(quantity) || rate <= 0 || quantity <= 0) return 0;
  return toCents(rate * quantity);
}
export function spendingTotals(entries: { total_amount: number; tracker_category?: string | null; cost_type?: string | null }[]) {
  const labor = toCents(entries.filter(isCrewLabor).reduce((s,e) => s + Number(e.total_amount),0));
  const total = toCents(entries.reduce((s,e) => s + Number(e.total_amount),0));
  return { labor, expenses: toCents(total-labor), total };
}
export function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : '') + text.replace(/"/g, '""')}"`;
}