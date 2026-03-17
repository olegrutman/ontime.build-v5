

# Add Labor Entry on CO Detail Page

## Files to create
1. **`src/components/change-orders/LaborEntryForm.tsx`** — Inline form for logging labor (hourly or lump sum), with NTE cap warning, date, rate (auto-loaded from profile), description, and save/cancel buttons.

2. **`src/components/change-orders/COLineItemRow.tsx`** — Expandable line item row replacing the current inline scope rendering. Shows labor entries, actual costs (FC only), and "Log hours" / "Actual cost" buttons. Uses `LaborEntryForm` inline.

## Files to modify
3. **`src/components/change-orders/CODetailPage.tsx`**:
   - Add imports: `COLineItemRow`, `useQueryClient`, `COCreatedByRole`
   - Add `role` variable: `const role: COCreatedByRole = isGC ? 'GC' : isTC ? 'TC' : 'FC';`
   - Add `queryClient` + `refreshDetail` function that invalidates `['co-detail', coId]`
   - Replace the scope card (lines 157-235) with the new version that uses `<COLineItemRow>` for each item, passing role, pricing type, NTE cap/used, and `canAddLabor` logic (non-GC + editable status or T&M/NTE pricing)

## Key behavior
- FC/TC can expand a line item and click "Log hours" or "Add pricing" to open the inline `LaborEntryForm`
- FC gets an additional "Actual cost" button for private cost tracking with margin display
- NTE warning appears at 95%+ usage before saving, requiring explicit confirmation
- GC sees no add buttons (read-only view of TC entries)
- After save, `refreshDetail()` invalidates queries to refresh all data

