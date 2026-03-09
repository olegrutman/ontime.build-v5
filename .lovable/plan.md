

# Allow PO Email on System Catalog Supplier

## What's happening now

When a project uses "System Catalog" as its supplier, the `po_email` field on the `project_designated_suppliers` record is set to `null`. When you click "Send" on a PO, the system looks up that `po_email` to pre-fill the recipient — but since it's null, the field comes up empty and you have to type the email manually every time.

## What's already built that makes this easy

- The `project_designated_suppliers` table already has a `po_email` column — it just needs to be populated.
- The "Send PO" button (in `PurchaseOrders.tsx`) already queries `po_email` from that table and auto-fills it. So once we store it, sending works automatically.
- The Team card already displays "PO → email@example.com" when `po_email` has a value.

## What needs to change

**One file: `TeamMembersCard.tsx`**

When the designated supplier is System Catalog (no real user, no invited email), show a small inline action to set or edit the PO delivery email:

- If `po_email` is **empty**: show an "Add PO Email" link/button next to "System Catalog"
- If `po_email` **exists**: keep the existing "PO → email" display, and make the "Change" button also allow editing the email

Clicking it opens a small inline input (or a minimal dialog) where the user types an email and saves. This updates the `po_email` column on the existing `project_designated_suppliers` row for that project.

No new tables, no new columns, no migrations. Just a small UI addition and one `update` call.

| File | Change |
|------|--------|
| `src/components/project/TeamMembersCard.tsx` | Add inline "Add PO Email" action for System Catalog entries, with a simple email input + save that updates `po_email` on the designated supplier row |

