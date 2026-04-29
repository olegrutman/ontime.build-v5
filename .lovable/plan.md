## Goal

Let any user (in the same org as a CO line) edit their own line-item inputs, with **two distinct edit windows**:

- **External (billable / upstream-facing) fields** — editable until **the CO is submitted upstream**.
- **Internal (private cost) fields** — editable until **the CO is finalized** (approved, rejected, or contracted).

Today everything collapses into a single `canEdit` flag (true for active statuses, false otherwise) and there is no edit UI for already-saved labor / material / equipment rows — only "add" and "delete". This plan adds inline editing and splits the gate.

---

## 1. Permission model — split `canEdit`

Extend `useCORoleContext` (`src/hooks/useCORoleContext.ts`) to return two new derived flags in addition to the existing `canEdit`:

- `canEditExternal` — true when the CO has **not yet been submitted** upstream.
  - For TC-created COs: false once `status ∈ {submitted, approved, rejected, contracted}` **or** `tc_submitted_price != null` / `fc_pricing_submitted_at != null` (per-party freeze that already exists in the CO/WO architecture).
  - For GC-created COs: false once `status ∈ {submitted, approved, rejected, contracted}`.
  - For FC-collaborator entries: false once `fc_pricing_submitted_at != null` for that CO.
- `canEditInternal` — true while the CO is not finalized: `status ∉ {approved, rejected, contracted}`.

Both new flags also require:
- The user belongs to the row's `org_id` (already enforced by RLS), and
- The row's `entered_by_role` / `added_by_role` matches the active org's role (i.e., a TC user only edits TC-entered rows; FC user only edits FC-entered rows).

Existing `canEdit` is kept for "add new line item / new entry" gating (unchanged behavior).

---

## 2. Inline edit UI for line items

**File:** `src/components/change-orders/COLineItemRow.tsx`

The header (item name, description, qty, unit, location, reason) is currently a static expand button. Add an "Edit" affordance (pencil icon, top-right of the header row, only shown when `canEditExternal && row.org_id === myOrgId`). Clicking opens an inline editor (a small `Popover` or inline form swap, mirroring the existing `QuantityEditPopover` pattern) with:

- `item_name` (text)
- `description` (textarea, preserves `whitespace-pre-line`)
- `qty` (number) + `unit` (read-only display of `unit`; unit is structural and stays locked)
- `location_tag` (existing location picker)
- `reason` (existing reason select)

Save calls `supabase.from('co_line_items').update({...}).eq('id', item.id)`. On save, call `onRefresh()`.

Empty/null guard: keep `unit` non-null (use existing value or fall back to `'ea'`) to avoid the not-null violation we already hit in this thread.

---

## 3. Inline edit UI for labor entries (financial inputs)

**File:** `src/components/change-orders/COLineItemRow.tsx` (entry rows around lines 237–276) and `LaborEntryForm.tsx`.

Today each entry row is read-only. Add a pencil icon at the right of each row (replacing/joining the empty `w-8` slot) shown when:
- For billable rows (`!is_actual_cost`): `canEditExternal`
- For internal rows (`is_actual_cost`): `canEditInternal`
- AND the row's `entered_by_role` matches the active org's role (so a TC can't edit FC's downstream entries — they remain visible but read-only).

Refactor `LaborEntryForm` to support an `editingEntry?: COLaborEntry` prop. When provided:
- Pre-fill `mode`, `entryDate`, `hours`, `rate`, `lumpSum`, `qty/unitPrice`, `description`, `internalCost` from the entry.
- On save, perform `update` (not `insert`) against `co_labor_entries` for that `id`.
- Header label switches to "Edit pricing entry" / "Edit internal cost".

Cancelling reverts to read-only display.

---

## 4. Inline edit UI for materials & equipment

**Files:** `src/components/change-orders/COMaterialsPanel.tsx`, `src/components/change-orders/COEquipmentPanel.tsx`.

Materials already has a `MarkupEditor` for `markup_percent`. Extend to full row editing:

- Add a row-level "Edit" toggle (pencil icon) gated by `canEditExternal` for: `description`, `quantity`, `uom`, `unit_cost`, `markup_percent`, `notes`, `is_on_site`.
- Add a separate column / inline field for `internal_cost_note` style fields if any exist as "internal" — current schema treats material rows as fully external (billable to GC). For now, the entire material row is gated by `canEditExternal`. (Internal-cost concept doesn't apply to material rows in current schema; flag this for the user in the closing sentence.)

Equipment: same pattern — full-row inline edit gated by `canEditExternal`.

Both pass through to `supabase.from('co_material_items'/'co_equipment_items').update(...)`.

---

## 5. Visual cues

- When `canEditExternal === false` but `canEditInternal === true`, show a small lock chip on external fields with tooltip "Locked — CO submitted".
- When `canEditInternal === false`, show a global "CO finalized — no further edits" notice in the entries panel header.

Reuse existing `Lock` icon already imported in `COLineItemRow.tsx`.

---

## 6. Files touched

- `src/hooks/useCORoleContext.ts` — add `canEditExternal`, `canEditInternal`.
- `src/components/change-orders/CODetailLayout.tsx` — pass new flags down.
- `src/components/change-orders/COLineItemRow.tsx` — header edit popover + per-row edit triggers; consume new flags.
- `src/components/change-orders/LaborEntryForm.tsx` — accept `editingEntry`, switch insert→update path.
- `src/components/change-orders/COMaterialsPanel.tsx` — full-row inline edit.
- `src/components/change-orders/COEquipmentPanel.tsx` — full-row inline edit.

No DB migrations required: RLS already permits `UPDATE` for users in the row's org. No schema additions needed (we derive everything from existing `status`, `tc_submitted_price`, `fc_pricing_submitted_at`, `entered_by_role`, `added_by_role`, `org_id`).

---

## 7. Out of scope (call out, do not build)

- Audit log of who edited what / when (no `updated_by` columns exist).
- Approver-side "edit anyone's entry" override — only same-org-as-row edits.
- Editing `unit` on a line item (structural; would invalidate generated totals downstream).
- Adding an "internal cost" concept to material/equipment rows (schema doesn't support it today — flagged for follow-up).
