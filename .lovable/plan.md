

# Bug Report: Create Return Wizard

## Bug 1 (CRITICAL): Wrong column name in supplier query -- no suppliers shown

**File**: `src/components/returns/CreateReturnWizard.tsx` (line 84)

The supplier query uses `.select('organization_id, organizations!inner(id, name)')` but the `project_team` table column is `org_id`, not `organization_id`. This means the query silently returns rows with `organization_id` as `null`, the map stays empty, and no suppliers appear in the wizard.

**Fix**: Change `organization_id` to `org_id` in the select clause, and update the mapping logic to use `row.organizations` correctly with the foreign key on `org_id`.

```text
Before: .select('organization_id, organizations!inner(id, name)')
After:  .select('org_id, organizations!inner(id, name)')
```

Also update the `forEach` to reference `row.organizations` (which is joined via `org_id`).

## Bug 2 (Medium): Wizard state not reset on close/reopen

When the dialog is closed and reopened, all state (step, selectedItems, reason, logistics fields) persists from the previous session. The user sees stale data from a prior abandoned return.

**Fix**: Add a `useEffect` that resets all state when `open` changes to `true`.

## Bug 3 (Minor): `qty_requested` allows 0 or negative via direct typing

The number input has `min={1}` but HTML min/max only affects spinner arrows, not typed values. A user can type `0` or `-5` and bypass `canProceedStep0` validation (which checks `> 0`). Also, `updateItemQty` caps at `max` but doesn't enforce `min >= 1`.

**Fix**: Clamp the value in `updateItemQty`: `Math.max(1, Math.min(qty, si.available))`.

## Bug 4 (Minor): Console warning -- ReturnStatusBadge ref forwarding

Console shows: "Function components cannot be given refs" for `ReturnStatusBadge`. This is because `ReturnCard` (or a parent) is trying to pass a ref to it.

**Fix**: Not critical, but wrap `ReturnStatusBadge` with `React.forwardRef` if needed, or the parent should stop passing a ref.

## Bug 5 (Minor): `urgency` field accessed via `(returnData as any).urgency`

In `ReturnCard.tsx` and `ReturnDetail.tsx`, urgency is accessed with `(returnData as any).urgency`. This is because the `Return` type already has `urgency` as an optional field, so the cast is unnecessary and hides potential type errors.

**Fix**: Remove the `as any` casts and use `returnData.urgency` directly.

---

## Files to modify

| File | Changes |
|------|---------|
| `src/components/returns/CreateReturnWizard.tsx` | Fix `org_id` column name (Bug 1), add state reset on open (Bug 2), clamp qty min to 1 (Bug 3) |
| `src/components/returns/ReturnCard.tsx` | Remove `(returnData as any)` casts for urgency (Bug 5) |
| `src/components/returns/ReturnDetail.tsx` | Remove `(returnData as any)` casts for urgency (Bug 5) |

