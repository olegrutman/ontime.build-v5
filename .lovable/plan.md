
## Investigation result (what is actually failing)

PO creation itself is now working.

The failure happens immediately after, when the app tries to insert the PO’s line items into `po_line_items`. The network logs show:

- `POST /purchase_orders` → **201 Created** (success)
- `POST /po_line_items` → **403** with:
  - code: `42501`
  - message: `new row violates row-level security policy for table "po_line_items"`

### Why RLS blocks `po_line_items` inserts
Your database security policy for inserting `po_line_items` currently requires the parent PO to be in **ACTIVE** status:

From migration `20260202171941_e6006e9c-1d6e-4c07-9d37-056b065c8eb3.sql`:

- `po_line_items` INSERT policy: allowed only when `purchase_orders.status = 'ACTIVE'` and user is a PM role in the org.

But our Work Order flow **creates the PO as `SUBMITTED` immediately** (to auto-send to supplier). That means:
- the PO is already `SUBMITTED`
- line items insert occurs after
- RLS rejects the insert because status is not `ACTIVE`

So the “Failed to create PO” toast is misleading: the PO row is created, but the line items fail, and your app treats that as a failed PO creation.

## Fix strategy (safe + matches your existing security model)

We will change the Work Order flow to a 2-step process:

1) Create PO as **ACTIVE**
2) Insert `po_line_items` (allowed by current RLS)
3) Update PO to **SUBMITTED** (auto-send to supplier)

This fits your existing RLS design:
- PM roles can insert line items only while PO is editable (`ACTIVE`)
- Suppliers price only after PO becomes `SUBMITTED`

## Implementation steps (code changes)

### Step 1 — Update `handlePOComplete` to use ACTIVE → insert items → SUBMITTED

**File:** `src/components/change-order-detail/MaterialResourceToggle.tsx`

Change behavior:

- When inserting into `purchase_orders`, set:
  - `status: 'ACTIVE'`
  - Do NOT set `submitted_at/submitted_by` yet
- After successful line items insert, run an update:
  - set `status: 'SUBMITTED'`
  - set `submitted_at: new Date().toISOString()`
  - set `submitted_by: user.id`

Pseudo-flow:

```ts
// 1) create PO as ACTIVE
insert purchase_orders { status: 'ACTIVE', ... }

// 2) insert po_line_items
insert po_line_items [...]

// 3) submit PO (update row while it’s still ACTIVE so policy allows it)
update purchase_orders
  set status='SUBMITTED', submitted_at=..., submitted_by=...
  where id = newPO.id
```

### Step 2 — Improve error handling messaging (so it’s obvious what failed)

**File:** `src/components/change-order-detail/MaterialResourceToggle.tsx`

Enhance the toast/error output to explicitly say which stage failed:
- “Failed to create PO”
- “Failed to add line items”
- “Failed to submit PO to supplier”

This will prevent future “unknown error” loops and speed debugging.

### Step 3 — Optional cleanup if line-items fail (nice-to-have)
If line items fail after PO creation, we can attempt to delete the newly created PO to avoid orphan “ACTIVE” POs.
However, your current DB policy for deleting purchase orders appears to be limited to GC_PM for ACTIVE (based on migrations), so TC may not be allowed to delete.
Plan:
- If delete fails due to RLS, we just show a message like:
  - “PO created but line items failed. Please contact admin to remove PO #...”
- This prevents silent clutter while respecting security rules.

## Verification checklist (end-to-end)

1) Open a change order: `/change-order/:id`
2) Toggle “Materials Needed”
3) Click “Add Materials via Product Picker”
4) Add at least 1 item and complete
5) Confirm:
   - PO is created
   - line items are created (no 403 on `/po_line_items`)
   - PO transitions to **SUBMITTED**
   - supplier can see it for pricing
   - work order Materials tile/panel shows the items

## Why this is the right fix

- Fixes the immediate RLS failure without weakening database security
- Preserves the intended workflow:
  - items can be edited only before submission
  - suppliers only price after submission
- Minimal change: only the Work Order creation sequence changes, not the schema/policies

## Files involved

- `src/components/change-order-detail/MaterialResourceToggle.tsx` (required)
