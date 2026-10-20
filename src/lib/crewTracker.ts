import { toCents } from '@/lib/money';

export type PayBasis = 'hourly' | 'daily';
export const EXPENSE_CATEGORIES = ['Nails & fasteners', 'Tools & blades', 'Equipment rental', 'Fuel', 'Materials', 'Disposal', 'Travel', 'Other'];
export function crewPay(rate: number, quantity: number): number {
  if (!Number.isFinite(rate) || !Number.isFinite(quantity) || rate <= 0 || quantity <= 0) return 0;
  return toCents(rate * quantity);
}
export function spendingTotals(entries: { total_amount: number; tracker_category?: string | null }[]) {
  const labor = toCents(entries.filter(e => e.tracker_category === 'labor').reduce((s,e) => s + Number(e.total_amount),0));
  const total = toCents(entries.reduce((s,e) => s + Number(e.total_amount),0));
  return { labor, expenses: toCents(total-labor), total };
}
export function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : '') + text.replace(/"/g, '""')}"`;
}