

# Fix: FC Loses CO Access After Input Completion + GC Materials Missing in Financial Card

## Bug 1: FC CO disappears after approval (and after completing input)

**Root cause — two layers:**

1. **RLS function `can_access_change_order`** checks collaborator `status = 'active'`. When FC completes input, the `complete_fc_change_order_input` RPC sets status to `'completed'`. After that, FC cannot read the CO or any of its data (labor, materials, equipment, activity) via RLS.

2. **Client-side grouping** in `useChangeOrders.ts` line 89: `isCollaborator` requires `collaboratorStatus === 'active'`, so completed collaborators are filtered out of the list.

**Fix:**

- **Database migration**: Update `can_access_change_order` to allow `status IN ('active', 'completed')` instead of just `'active'`
- **`src/hooks/useChangeOrders.ts` line 89**: Change the check to include both `active` and `completed` statuses: `co.collaboratorStatus === 'active' || co.collaboratorStatus === 'completed'`

## Bug 2: GC materials don't show in Financial sidebar card

**Root cause:** The Financial sidebar (line 461) gates material display on `co.materials_needed`. If the wizard didn't set this flag but materials were added to the CO anyway (e.g., TC added them during work), the GC never sees material costs in the sidebar or the grand total.

**Fix in `src/components/change-orders/CODetailPage.tsx`:**

Replace `co.materials_needed` checks in the Financial sidebar with `(co.materials_needed || financials.materialsTotal > 0)` — show materials whenever there's actual material cost, regardless of the wizard flag.

Apply same logic for equipment: `(co.equipment_needed || financials.equipmentTotal > 0)`.

Also apply to the hero KPI cards (lines 290, 296) so the KPI appears whenever there are actual costs.

## SQL Migration

```sql
CREATE OR REPLACE FUNCTION public.can_access_change_order(_co_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.change_orders co
    WHERE co.id = _co_id
      AND (
        public.user_in_org(_user_id, co.org_id)
        OR (co.assigned_to_org_id IS NOT NULL AND public.user_in_org(_user_id, co.assigned_to_org_id))
        OR EXISTS (
          SELECT 1
          FROM public.change_order_collaborators coc
          WHERE coc.co_id = co.id
            AND coc.status IN ('active', 'completed')
            AND public.user_in_org(_user_id, coc.organization_id)
        )
      )
  );
$$;
```

## Files changed

| File | Change |
|------|--------|
| Migration | Update `can_access_change_order` to allow `completed` collaborators |
| `src/hooks/useChangeOrders.ts` | Include `completed` collaborator status in FC visibility check |
| `src/components/change-orders/CODetailPage.tsx` | Show materials/equipment in Financial card and hero KPIs when actual costs exist, not just when wizard flag is set |

