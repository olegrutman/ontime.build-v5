

# Fix: Supplier Still Shows in Readiness After Removal

## Problem

When a supplier team member is removed, the cascading delete cleans up `project_contracts`, `project_participants`, `project_invites`, and `project_team` — but does **not** clean up `project_designated_suppliers`. The readiness hook queries `project_designated_suppliers` independently (line 121: `hasDesignatedSupplier = designatedSuppliers.some(ds => ds.status === 'active')`), so removed suppliers persist in the checklist as "Awaiting Supplier."

Additionally, supplier estimate records in `supplier_estimates` are not cleaned up either, which could cause stale "Awaiting supplier estimate" items.

## Fix

### `src/components/project/TeamMembersCard.tsx`

In `handleRemoveMember`, add cleanup for `project_designated_suppliers` when the removed member's role is `SUPPLIER` (or `SUP`):

- Before deleting the team row, also delete/update `project_designated_suppliers` where the project matches and the supplier org matches (or set status to `'removed'` to match the existing pattern used in `fetchDesignatedSupplier` which filters `neq('status', 'removed')`)
- Also delete from `supplier_estimates` where `supplier_org_id` matches the removed org

### One file to edit

| File | Change |
|------|--------|
| `src/components/project/TeamMembersCard.tsx` | Add `project_designated_suppliers` and `supplier_estimates` cleanup to `handleRemoveMember` when removing a supplier role member |

No database changes needed.

