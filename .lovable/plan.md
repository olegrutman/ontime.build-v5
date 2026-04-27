## Fix: Combined item insert fails — `unit` is NOT NULL

**Root cause:** When the user combines selected scope items, the synthetic combined row sets `unit: null` (mixed units don't make sense). But `co_line_items.unit` has a `NOT NULL` constraint, so the insert fails:

> `null value in column "unit" of relation "co_line_items" violates not-null constraint`

This blocks saving any combined item from both the CO Wizard and the **+ Add item** mini-wizard.

## Fix

Default `unit` to `'EA'` (each) at insert time when it's missing — affects only the combined row in practice; non-combined items always have a unit from the catalog.

### Files

- `src/components/change-orders/wizard/COWizard.tsx` (line 473): `unit: item.unit` → `unit: item.unit || 'EA'`
- `src/components/change-orders/AddScopeItemButton.tsx` (line 196): same change.

No DB migration. No UI change — the combined row already shows "N bundled" instead of a qty/unit pair, so 'EA' is just a satisfies-the-constraint placeholder that the user never sees.
