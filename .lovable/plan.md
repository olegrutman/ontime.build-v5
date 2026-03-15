

# Fix: "Create & Send" Doesn't Set SUBMITTED Status

## Root Cause

The `send-po` edge function returns **404** ("Purchase order not found or access denied") because it queries the PO using a user-scoped client with RLS. After verifying auth, it should use the **service role client** to fetch and update the PO, avoiding RLS issues entirely.

Additionally, `auth.getClaims(token)` is not a standard supabase-js method and is fragile. It should be replaced with `auth.getUser(token)`.

## Bugs Found

| # | Location | Bug |
|---|----------|-----|
| 1 | `send-po/index.ts` | `getClaims(token)` is non-standard; should use `getUser(token)` |
| 2 | `send-po/index.ts` | PO fetched via userClient (RLS) after auth is verified — causes 404. Should use service client |
| 3 | `PurchaseOrdersTab.tsx` | If `send-po` fails, PO stays as ACTIVE with no status update — user thinks PO was sent |

## Fix

| File | Change |
|---|---|
| `supabase/functions/send-po/index.ts` | Replace `getClaims(token)` with `getUser(token)`. Use service client for PO fetch and line items query (auth already verified). Keep service client for status update (already there). |
| `src/components/project/PurchaseOrdersTab.tsx` | After `send-po` fails, ensure PO stays ACTIVE and error message is clear (already handled, just verify toast shows the actual edge function error) |

The edge function changes:
- Line 56: `auth.getClaims(token)` → `auth.getUser(token)`, extract `user.id` instead of `claims.sub`
- Lines 78-95: Replace `userClient.from("purchase_orders")` with `serviceClient.from("purchase_orders")` (service client is already created later — move it up)
- Lines 98-101: Replace `userClient.from("po_line_items")` with `serviceClient.from("po_line_items")`

