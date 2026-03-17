

# Types and Hooks for Change Orders

Create 4 files exactly as specified — no UI, no components, no pages.

## Files to Create

1. **`src/types/changeOrder.ts`** — All CO type definitions, status/reason enums, interfaces for ChangeOrder, line items, labor, materials, equipment, NTE log, activity, financials, and "New" input types.

2. **`src/hooks/useWorkOrderCatalog.ts`** — Fetches `work_order_catalog` table, groups items into division → category → group hierarchy, provides a `search()` function.

3. **`src/hooks/useChangeOrders.ts`** — Fetches all COs for a project, groups them into `mine` (by status bucket) and `sharedWithMe`. Provides `createCO`, `updateCO`, `shareCO`, `combineCOs` mutations.

4. **`src/hooks/useChangeOrderDetail.ts`** — Fetches a single CO with all related data (line items, labor, materials, equipment, NTE log, activity). Computes `COFinancials` from the data. Provides full CRUD mutations for line items, labor, materials, equipment, plus workflow mutations (submit, approve, reject) and NTE increase request/approve/reject.

## Verification

After creation, confirm no TypeScript compile errors in the console.

