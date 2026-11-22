export function nteCeilingError(
  pricingType: string | null | undefined,
  ceiling: number | null | undefined,
  currentActuals = 0,
): string | null {
  if (pricingType !== 'nte') return null;
  if (ceiling == null || !Number.isFinite(ceiling) || ceiling <= 0) {
    return 'Set a Not-to-exceed ceiling greater than zero before continuing.';
  }
  if (ceiling + 0.005 < currentActuals) {
    return `The ceiling cannot be below current billable actuals of $${currentActuals.toFixed(2)}.`;
  }
  return null;
}

export function parseNteCeiling(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
