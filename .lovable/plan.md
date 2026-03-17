

# Materials, Equipment, and Status Actions on CO Detail Page

## Files to create

1. **`src/components/change-orders/COMaterialsPanel.tsx`** — Full materials management panel for TC to add/delete material rows with inline draft editing (description, qty, UOM, unit cost, markup %), table view for existing items, and role-aware display (GC sees billed only, TC sees cost+markup).

2. **`src/components/change-orders/COEquipmentPanel.tsx`** — Equipment panel with quick-pick suggestions (common equipment list) and custom entry. TC can add/delete items with cost, duration, and markup fields. Same role-aware display pattern.

3. **`src/components/change-orders/COStatusActions.tsx`** — Status action bar using `submitCO`, `approveCO`, `rejectCO` from `useChangeOrderDetail` and `shareCO`, `updateCO` from `useChangeOrders`. Actions:
   - **Share**: creator can share draft CO
   - **Submit**: TC/FC can submit draft/shared/combined
   - **Recall**: TC/FC can recall submitted CO back to draft
   - **Approve**: GC approves submitted; TC approves FC-submitted
   - **Reject**: with AlertDialog requiring a note
   - Shows status banners for contracted/approved/rejected states

## Files to modify

4. **`src/components/change-orders/CODetailPage.tsx`**:
   - Add imports for `COMaterialsPanel`, `COEquipmentPanel`, `COStatusActions`
   - Add `canEdit` variable after `refreshDetail`
   - Replace static materials section (lines 206-252) with `<COMaterialsPanel>` — note: remove `&& materials.length > 0` condition so panel shows even when empty (TC needs to add)
   - Replace static equipment section (lines 254-292) with `<COEquipmentPanel>` — same: remove `&& equipment.length > 0`
   - Add `<COStatusActions>` at top of sidebar column (before financial summary card, line 297)

5. **`src/components/change-orders/index.ts`** — Add exports for all three new components.

## Key details

- Both panels insert directly via `supabase.from('co_material_items').insert()` / `co_equipment_items` and call `onRefresh` (which invalidates `['co-detail', coId]`)
- `useChangeOrderDetail` already exposes `submitCO`, `approveCO`, `rejectCO` mutations — `COStatusActions` uses these
- `useChangeOrders` exposes `shareCO` and `updateCO` — used for share and recall actions
- The `co_material_items.line_total` is a generated column per memory constraints — inserts only send `unit_cost`, not `line_total`
- `canEdit` gates add/delete buttons: `co.status in [draft, shared, combined] || pricing_type in [tm, nte]`

