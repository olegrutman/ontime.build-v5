

# Fix Team Card: Supplier Detection + Material Responsibility Setter

## Problems

1. **"No supplier" pill** — The card only checks `project_designated_suppliers` table, but the supplier (`Supplier_Test`) exists in `project_team` with role `Supplier`. The card should also detect suppliers from the team list.

2. **Material responsibility can't be set** — The contract has `material_responsibility = null` and the card has no UI to set it. It only displays the value when already set.

## Changes

### File: `src/components/project/GCProjectOverviewContent.tsx`

1. **Fix supplier detection** — In `fetchTeam`, after fetching team data, also check if any team member has role `'Supplier'`. Use that name as fallback when `project_designated_suppliers` has no row:
   ```
   const supplierFromTeam = teamRes.data?.find(m => m.role === 'Supplier');
   setDesignatedSupplier(supplierRes.data?.invited_name ?? supplierFromTeam?.invited_org_name ?? null);
   ```

2. **Fix pill** — The pill will now correctly show "Supplier set" when a supplier exists in the team.

3. **Add material responsibility selector** — When `materialResp` is null and user `canInvite` (is GC), show two buttons (GC / TC) to set it. On click, update `project_contracts.material_responsibility` and refresh:
   ```
   ┌──────────────────────────────────┐
   │ Who handles materials?           │
   │ [General Contractor] [Trade Con] │
   └──────────────────────────────────┘
   ```

4. **Add change button** — When `materialResp` is already set and not locked, show a small "Change" link to re-open the selector.

## Files Changed

| File | Change |
|------|--------|
| `src/components/project/GCProjectOverviewContent.tsx` | Fix supplier fallback from team list; add material responsibility setter UI |

### What is NOT changing
- Database schema, RLS, other components
- `OverviewTeamCard.tsx` (standalone component, not used here)

