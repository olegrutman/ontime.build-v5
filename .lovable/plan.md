## What's happening

This CO (`f9865ab8…`) has `fc_input_needed = true` but **zero rows** in `change_order_collaborators`. That's why the detail page's "Field crew involvement" card shows *"No FC requested yet"* even though FC was toggled on in the wizard.

The project does have an FC participant (Pacifico Builders), so the data is available — the wizard simply never wrote the collaborator row.

### Root cause (in `src/components/change-orders/picker-v3/PickerShell.tsx`, lines 324–333)

```ts
if (state.collaboration.requestFcInput && state.collaboration.assignedFcOrgId) {
  await supabase.from('change_order_collaborators').insert({ … });
}
```

Two problems compound here:

1. **Silent skip** — if `assignedFcOrgId` is falsy, the insert is skipped without a warning, but `fc_input_needed: true` is still written on the CO. The two fields drift apart.
2. **Auto-pick only runs on toggle** — `assignedFcOrgId` is auto-set to `fcOrgs[0].id` *inside* the Switch's `onCheckedChange` (StepPricingAndRouting.tsx:148). If `requestFcInput` was already true when the user landed on the step (default state, or returning to a previous wizard), or if `fcOrgs` hadn't loaded yet at toggle time, no FC org is selected and the Switch passes Step 3 with `assignedFcOrgId = null`.
3. **No error check** on the insert — `await supabase…insert(...)` discards the return value, so even a real RLS/constraint failure would be invisible.

The user's CO almost certainly hit case (2): toggle was on, FC list rendered, but no FC was explicitly clicked, so submission shipped with `requestFcInput=true` and `assignedFcOrgId=null`.

## Fix plan

### 1. PickerShell.tsx (submit handler)

- If `requestFcInput` is true but `assignedFcOrgId` is empty, **fall back to `fcOrgs[0]?.id`** (same as the toggle's auto-pick) before inserting.
- If still no FC org available, set `fc_input_needed = false` on the CO insert so the two fields stay consistent.
- Capture and surface errors from the collaborator insert (`const { error } = await …; if (error) console.error / toast`).

### 2. StepPricingAndRouting.tsx

- On step mount, if `collab.requestFcInput && !collab.assignedFcOrgId && fcOrgs.length > 0`, dispatch `SET_ASSIGNED_FC` with `fcOrgs[0].id` (covers the "already on" and "list loaded late" cases).
- Visually flag the step as incomplete (or block "Next") when `requestFcInput` is on but no FC is picked, so the user can't accidentally proceed.

### 3. Repair the existing CO

Either:
- a one-shot manual fix: insert a `change_order_collaborators` row for this CO with Pacifico Builders / status `invited`, OR
- a backfill migration that, for every CO where `fc_input_needed = true` and no collaborator row exists, inserts the project's accepted FC org (only if exactly one FC exists on the project).

I'd recommend (a) for this single project + (b) only if you want to clean up other affected COs.

## Out of scope (not changing)

- RLS policies on `change_order_collaborators` (they're correct — TC owner org can insert).
- The FC card / detail page UI (`FCInputRequestCard`) — it's working as designed; it just had no collaborator row to display.
- The status lifecycle, pricing, or routing logic.
