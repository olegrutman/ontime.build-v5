
# Filter Causes by System (CO picker)

Small, frontend-only change. No new tables, no new taxonomies, no migrations.

## Goal

When the user picks a System in Step 1 of the CO picker, only show the Causes ("Problems") that are sensible for that system. Work-type filtering already exists via `useScopeCatalog().filterByContext` — this plan does not touch it.

## Files

- **Modify:** `src/components/change-orders/picker-v3/StepWhereAndWhy.tsx`
- **Modify:** `src/components/change-orders/picker-v3/types.ts` (add one optional field to `CauseOption`)
- **Modify:** `src/components/change-orders/picker-v3/usePickerState.ts` (clear cause when system changes if no longer allowed)
- **Add tests:** `src/test/pickerReducer.test.ts` (one new case)

## Changes

### 1. `types.ts` — add optional allowlist to `CauseOption`

```ts
export interface CauseOption {
  // ...existing fields
  /** Optional system allowlist. When omitted, the cause applies to all systems. */
  allowedSystems?: string[];   // values from SystemOption.id
}
```

### 2. `StepWhereAndWhy.tsx` — annotate `CAUSES` and filter the grid

Add `allowedSystems` to the items where it matters. Causes without the field stay global (most of them are — `GC Request`, `Owner Upgrade`, `Damaged Work`, etc. legitimately apply everywhere).

Proposed annotations (only the non-global ones):

| Cause id | Allowed systems |
|---|---|
| `mech` Mechanical Conflict | `floor`, `wall`, `ceiling`, `roof` |
| `plumb` Plumbing Conflict | `floor`, `wall`, `ceiling` |
| `elec` Electrical Conflict | `floor`, `wall`, `ceiling` |
| `frame` Framing Correction | `floor`, `wall`, `roof`, `ceiling`, `deck`, `stair`, `openings` |
| `plan` Plan Revision | all (omit field) |
| `unfor` Unforeseen Condition | all (omit field) |
| `mat` Material Defect | all (omit field) |
| `miss` Missed Scope | all (omit field) |
| `gc`, `upg`, `ve`, `punch`, `dmg` | all (omit field) |

Then in the render, filter each group:

```tsx
const visibleCauses = useMemo(() => CAUSES.map(group => ({
  ...group,
  items: group.items.filter(c =>
    !c.allowedSystems || !cur.system || c.allowedSystems.includes(cur.system)
  ),
})).filter(group => group.items.length > 0), [cur.system]);
```

Render from `visibleCauses` instead of `CAUSES`. Before a system is picked, everything shows (no system → no filter).

### 3. `usePickerState.ts` — clear invalid cause on system change

Update the `SET_SYSTEM` case to also clear `causeId / causeName / reason / docType / billable` if the currently selected cause is no longer allowed for the new system. Keeps the existing reset of `workTypes`, `workNames`, `narrative`.

### 4. Tests

Add one case to `pickerReducer.test.ts` verifying that switching System wipes a now-invalid Cause but preserves a still-valid one.

## Acceptance

- Picking `Stair` no longer shows `Mechanical Conflict` / `Plumbing Conflict` / `Electrical Conflict`.
- Picking `Roof System` no longer shows `Plumbing Conflict` / `Electrical Conflict`.
- With no system selected, all causes are visible (current behavior).
- Changing system after picking an invalid cause clears the cause selection; valid causes stay.
- No DB migrations; no changes to `CODetail`, SOV, pricing, or scope catalog.

## Out of scope

- DB-backed system/action/problem taxonomy.
- Per-system filtering of work types — already handled by `useScopeCatalog().filterByContext`.
- Any change to routing, pricing, or downstream CO logic.
