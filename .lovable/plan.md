

# NTE Increase Flow, Real-time, Activity Feed

## Files to create

1. **`src/components/change-orders/CONTEPanel.tsx`** — Full NTE management panel replacing the static gauge. Shows cap/used/remaining with progress bar, warning banners at 80%/95%, TC/FC can request increase (AlertDialog), GC sees pending request with approve/decline actions, plus history of past requests.

2. **`src/hooks/useCORealtime.ts`** — Supabase realtime hook subscribing to `co_labor_entries`, `co_material_items`, `co_equipment_items`, `co_nte_log`, `change_orders`, and `co_activity` tables filtered by `co_id`. Invalidates corresponding query keys on changes.

3. **`src/components/change-orders/COActivityFeed.tsx`** — Activity timeline component showing role-colored badges, action labels, amounts, details, and relative timestamps.

## Files to modify

4. **`src/components/change-orders/CODetailPage.tsx`**:
   - Add imports: `CONTEPanel`, `COActivityFeed`, `useCORealtime`
   - Add `useCORealtime(coId ?? null)` after `useChangeOrderDetail`
   - Destructure `nteLog` and `activity` from `useChangeOrderDetail`
   - Replace static NTE card (lines 332-374) with `<CONTEPanel>`
   - Add `<COActivityFeed activity={activity} />` after equipment panel in main column

5. **`src/components/change-orders/wizard/COWizard.tsx`**:
   - After line 171 (line items inserted) and before line 174 (share check), insert activity log for 'created' action

6. **`src/components/change-orders/COStatusActions.tsx`**:
   - Add `supabase` and `useAuth` imports
   - Add `user` and `actorRole` variables
   - Add `logActivity` helper function
   - Add `await logActivity(...)` calls after each successful action (share, submit, approve, reject, recall)

7. **`src/components/change-orders/index.ts`** — Add exports for `CONTEPanel` and `COActivityFeed`

## Key implementation notes

- `useChangeOrderDetail` already returns `nteLog` and `activity` — just need to destructure them in `CODetailPage`
- `useChangeOrderDetail` already exposes `requestNTEIncrease`, `approveNTEIncrease`, `rejectNTEIncrease` mutations
- Realtime hook uses separate `.on()` calls per table with `co_id` filter, invalidates granular query keys like `['co-detail', coId, 'labor']`
- Activity logging is fire-and-forget (no await needed for UX, but we'll await for consistency)

