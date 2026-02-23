

# Real-Time Updates, SOV Rules, and Material Estimate Visibility

## Analysis Summary

After analyzing the "Main Street Apartments" project (GC_Test, TC_Test, FC_Test, Supplier_Test), I found three areas to address:

---

## 1. Real-Time Updates on Work Order Detail Page

**Problem**: The work order detail page (`ChangeOrderDetailPage`) has zero real-time subscriptions. When multiple roles (GC, TC, FC) are working on the same work order simultaneously, no one sees each other's changes until they manually refresh.

**Root cause**: The `useProjectRealtime` hook only runs on `ProjectHome`. The sub-tables used by work orders (`change_order_fc_hours`, `change_order_tc_labor`, `change_order_materials`, `change_order_equipment`, `change_order_checklist`, `change_order_participants`) are not even in the `supabase_realtime` publication.

**Fix**:

### A. Database migration -- Add tables to realtime publication
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.change_order_fc_hours;
ALTER PUBLICATION supabase_realtime ADD TABLE public.change_order_tc_labor;
ALTER PUBLICATION supabase_realtime ADD TABLE public.change_order_materials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.change_order_equipment;
ALTER PUBLICATION supabase_realtime ADD TABLE public.change_order_checklist;
ALTER PUBLICATION supabase_realtime ADD TABLE public.change_order_participants;
```

### B. New hook -- `src/hooks/useChangeOrderRealtime.ts`
Create a focused realtime hook that subscribes to the `change_order_projects` table filtered by the specific work order ID, plus the six sub-tables above. On any change, invalidate the relevant React Query keys:
- `['change-order', changeOrderId]`
- `['change-order-participants', changeOrderId]`
- `['change-order-fc-hours', changeOrderId]`
- `['change-order-tc-labor', changeOrderId]`
- `['change-order-materials', changeOrderId]`
- `['change-order-equipment', changeOrderId]`
- `['change-order-checklist', changeOrderId]`

### C. Wire it up -- `src/components/change-order-detail/ChangeOrderDetailPage.tsx`
Import and call `useChangeOrderRealtime(id)` at the top of the component.

---

## 2. SOV for TC and FC Contracts -- No Action Needed

**Finding**: The database trigger `convert_co_to_contract` (on `change_order_projects`) already auto-generates:
- A GC-TC contract with a single-item SOV
- An FC-TC contract (if FC participated) with a single-item SOV

This fires automatically when a work order status changes to `approved`. The GC does NOT need to manually create SOV for these auto-generated contracts. No code change required here.

---

## 3. Material Estimate Visibility -- Both TC and GC Should See Estimates

**Problem**: The `ProjectEstimatesReview` component uses a single `isResponsible` flag to gate BOTH viewing pricing info AND showing approve/reject buttons. In the Main Street Apartments project, `material_responsibility = 'TC'`, so only TC sees pricing. But the user wants both GC and TC to see material estimates.

**Fix**: Split the logic into two separate checks in `ProjectEstimatesReview.tsx`:

### A. `canViewEstimates` -- true for any GC or TC participant
Both GC and TC on the project should be able to see estimate details and pricing. Check if the user's org is either the `from_org_id` or `to_org_id` on any contract with `material_responsibility` set, OR if the user's org type is GC or TC.

### B. `isResponsible` -- only the material-responsible party (keeps current logic)
Only the responsible party (GC or TC based on the `material_responsibility` field) gets the approve/reject buttons.

**Changes to `src/components/project/ProjectEstimatesReview.tsx`**:
- Add `canViewEstimates` state (true if user is GC or TC on the project)
- Replace `isResponsible` checks that gate pricing visibility with `canViewEstimates`
- Keep `isResponsible` only for the approve/reject action buttons

---

## Files to Change

| File | Change |
|------|--------|
| Database migration | Add 6 tables to realtime publication |
| `src/hooks/useChangeOrderRealtime.ts` | New file -- realtime subscriptions for work order detail |
| `src/components/change-order-detail/ChangeOrderDetailPage.tsx` | Wire up realtime hook |
| `src/components/project/ProjectEstimatesReview.tsx` | Split visibility vs. approval permissions |

## No Changes Needed
- SOV auto-creation is already handled by the `convert_co_to_contract` trigger
- RLS on `supplier_estimates` already allows all project participants to view

