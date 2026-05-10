# CO list: stale "Submitted" status + missing $390 amount on CO-0002

## Findings (confirmed against the database)

Both COs on Fuller Residence are actually `status = 'approved'` in `change_orders`. The card UI is wrong on two independent axes.

**CO-FUL-IM-HA-0002 ("Wall System · GC Request")** — approved, but:
- `change_orders.tc_submitted_price` = `NULL`
- `change_orders.gc_budget` = `NULL`
- `co_labor_entries` has the TC's $390 lump-sum row (`pricing_mode = 'lump_sum'`, `line_total = 390`, `entered_by_role = 'TC'`) and the FC's $210 row.

So the $390 is real — it lives in `co_labor_entries`, not on the parent `change_orders` row. The list card today only reads `tc_submitted_price` from the parent row, so it renders `$0`.

**CO-FUL-IM-HA-0001** — approved, `tc_submitted_price = 1170`, renders correctly as `$1,170`.

### Why the status badge stays on "Submitted"

`useChangeOrderDetail.invalidate()` (`src/hooks/useChangeOrderDetail.ts:25`) only invalidates `['co-detail', coId]`. The list page reads `['change-orders', projectId, orgId]` (`src/hooks/useChangeOrders.ts:59`), which is never invalidated by approve/reject/etc. Until you hard-refresh, the list shows the pre-approval snapshot.

### Why the amount is wrong on CO-0002

`COBoardCard.tsx:160` renders `co.tc_submitted_price ?? 0`. The list query in `useChangeOrders` only selects `change_orders.*` and never joins to `co_labor_entries` / `co_material_items` / `co_equipment_items`. Detail page logic (`useChangeOrderDetail.ts:168–184`) is the authoritative formula:

```
tcBillableToGC = use_fc_pricing_base && tc_submitted_price > 0
                   ? tc_submitted_price
                   : sum(billable TC labor entries)
grandTotal     = tcBillableToGC + materialsTotal + equipmentTotal
```

For CO-0002 that yields `390 + 0 + 0 = $390`, which is what the user expects.

## Fix

### 1. Broaden the detail-hook invalidation (status fix)

`src/hooks/useChangeOrderDetail.ts`

```ts
const invalidate = () => {
  queryClient.invalidateQueries({ queryKey: ['co-detail', coId] });
  if (co?.project_id) {
    queryClient.invalidateQueries({ queryKey: ['change-orders', co.project_id] });
  }
};
```

`co` is already loaded in the same hook, so no signature change. Approve / reject / submit / withdraw / contract / pricing edits will now refresh the list page automatically.

### 2. Compute the card amount the same way the detail page does (amount fix)

In `src/hooks/useChangeOrders.ts` `queryFn`, after `allCOs` is loaded and we have the CO IDs, run two more parallel selects scoped to those IDs:

```ts
const coIds = allCOs.map(c => c.id);

const [{ data: laborRows }, { data: matRows }, { data: eqRows }] = await Promise.all([
  supabase.from('co_labor_entries')
    .select('co_id, entered_by_role, line_total, is_actual_cost')
    .in('co_id', coIds),
  supabase.from('co_material_items')
    .select('co_id, billed_amount')
    .in('co_id', coIds),
  supabase.from('co_equipment_items')
    .select('co_id, billed_amount')
    .in('co_id', coIds),
]);
```

Build a per-CO totals map applying the detail-page formula, then attach `display_total` to each item:

```ts
const tcLaborByCo = new Map<string, number>();
for (const r of laborRows ?? []) {
  if (r.is_actual_cost) continue;            // billable only
  if (r.entered_by_role !== 'TC') continue;  // matches tcLaborTotal
  tcLaborByCo.set(r.co_id, (tcLaborByCo.get(r.co_id) ?? 0) + (r.line_total ?? 0));
}
const matByCo = /* sum billed_amount per co_id */;
const eqByCo  = /* sum billed_amount per co_id */;

const computeDisplayTotal = (co) => {
  const tcLabor = tcLaborByCo.get(co.id) ?? 0;
  const tcBillableToGC = co.use_fc_pricing_base && co.tc_submitted_price > 0
    ? co.tc_submitted_price
    : tcLabor;
  return tcBillableToGC + (matByCo.get(co.id) ?? 0) + (eqByCo.get(co.id) ?? 0);
};
```

Add `display_total: number` to `ChangeOrderWithMembers` (in `useChangeOrders.ts` — local extension, not touching `ChangeOrder` types). Attach it in the `.map(c => ({ ... }))`.

In `src/components/change-orders/COBoardCard.tsx:160` swap:

```diff
- {fmtCurrency(co.tc_submitted_price ?? 0)}
+ {fmtCurrency((co as any).display_total ?? co.tc_submitted_price ?? 0)}
```

(Fallback keeps it safe if a card is rendered from a code path that hasn't computed `display_total`.)

### 3. Out of scope (documenting, not fixing here)

- The CO-0002 row was approved with `tc_submitted_price = NULL`. The approval flow doesn't snapshot the labor sum back onto `change_orders.tc_submitted_price`. That's the deeper "approval should freeze the price" gap (memory: `co-wo-system-spec` / `financial-and-pricing-architecture`). Fixing that would also fix the card via path #2's fallback. If you want me to also patch the approve mutation to write `tc_submitted_price = computed total` when it's null, say the word — otherwise I'll leave the snapshot untouched and rely on the list-side aggregation.

## Files touched

- `src/hooks/useChangeOrderDetail.ts` — broaden `invalidate()`.
- `src/hooks/useChangeOrders.ts` — fetch labor/materials/equipment for the project's COs, compute `display_total` per CO, attach to returned items.
- `src/components/change-orders/COBoardCard.tsx` — read `display_total` with `tc_submitted_price` fallback.

## Verification

1. CO-FUL-IM-HA-0002 card on `/change-orders` shows `$390` (TC's lump-sum) and the "Approved" pill.
2. CO-FUL-IM-HA-0001 card still shows `$1,170` and "Approved".
3. From the detail page, approve/reject another CO → switching back to the list reflects the new status without manual refresh.
4. The Active tab drops both COs (now Approved), Approved tab shows count 2, Approved KPI ≠ $0.
