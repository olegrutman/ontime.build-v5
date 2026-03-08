import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Shared currency formatter.
 * - Whole-dollar display for normal values (e.g. "$150,000")
 * - Compact notation for values >= $1M (e.g. "$1.5M")
 * - Handles null/undefined gracefully
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—';
  if (Math.abs(amount) >= 1_000_000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 1,
      notation: 'compact',
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Currency formatter that always shows 2 decimal places.
 * Use for line-item pricing, invoices, and PO detail views.
 */
export function formatCurrencyPrecise(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
