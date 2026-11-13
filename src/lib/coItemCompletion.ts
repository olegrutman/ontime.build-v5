export interface CompletableItem {
  id: string;
  approval_status: string;
  completed_at?: string | null;
}

export function isCompletedBillableItem(item: CompletableItem): boolean {
  return item.approval_status === 'approved' && Boolean(item.completed_at);
}

/** Previously billed progress must be credited before completed-item claims. */
export function completedItemClaims(
  items: CompletableItem[],
  entries: { id: string; co_line_item_id: string; line_total: number | null }[],
  reservedIds: Set<string>,
  remaining: number,
  priorProgress = 0,
) {
  let available = Math.max(0, remaining);
  let credit = Math.max(0, priorProgress);
  return items.filter(isCompletedBillableItem).flatMap(item => {
    const rows = entries.filter(e => e.co_line_item_id === item.id && !reservedIds.has(e.id));
    const total = Math.round(rows.reduce((sum, e) => sum + Number(e.line_total ?? 0), 0) * 100) / 100;
    const appliedCredit = Math.min(total, credit);
    credit -= appliedCredit;
    const amount = Math.round(Math.min(available, Math.max(0, total - appliedCredit)) * 100) / 100;
    available -= amount;
    return amount > 0 ? [{ itemId: item.id, amount, entryIds: rows.map(e => e.id) }] : [];
  });
}