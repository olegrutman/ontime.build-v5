

# Fix: TC Can't Request FC Input on Change Order

## Root Cause — Two Permission Bugs

### Bug 1: Database function `can_request_fc_change_order_input`
The function only allows users from `co.assigned_to_org_id` (the GC org) to request FC input. The TC who created the CO is in `co.org_id`, not `co.assigned_to_org_id`. So the RPC returns 403.

**Current:** `user_in_org(_user_id, co.assigned_to_org_id)`
**Fix:** `(user_in_org(_user_id, co.assigned_to_org_id) OR user_in_org(_user_id, co.org_id))`

### Bug 2: Client-side check in `useCORoleContext.ts`
`canRequestFCInput` for non-draft statuses checks `co.assigned_to_org_id === myOrgId` — which is the GC org, not the TC org. So the sidebar's "Request FC input" button is also hidden.

**Current:**
```
co.assigned_to_org_id === myOrgId && ['shared', 'rejected', 'work_in_progress', 'closed_for_pricing'].includes(co.status)
```
**Fix:** Add `|| co.org_id === myOrgId` for those same statuses.

## Changes

### 1. Database Migration — Fix `can_request_fc_change_order_input`

```sql
CREATE OR REPLACE FUNCTION public.can_request_fc_change_order_input(
  _co_id uuid, _fc_org_id uuid, _user_id uuid DEFAULT auth.uid()
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.change_orders co
    JOIN public.organizations org ON org.id = _fc_org_id
    JOIN public.project_team pt ON pt.project_id = co.project_id AND pt.org_id = _fc_org_id
    WHERE co.id = _co_id
      AND (
        public.user_in_org(_user_id, co.assigned_to_org_id)
        OR public.user_in_org(_user_id, co.org_id)
      )
      AND co.status IN ('draft', 'shared', 'rejected', 'work_in_progress', 'closed_for_pricing')
      AND org.type = 'FC'
      AND _fc_org_id <> co.org_id
      AND _fc_org_id <> co.assigned_to_org_id
  );
$$;
```

### 2. `src/hooks/useCORoleContext.ts` — Fix `canRequestFCInput`

Change the condition to:
```ts
const canRequestFCInput = !!co && isTC && (
  ((co.assigned_to_org_id === myOrgId || co.org_id === myOrgId) &&
    ['shared', 'rejected', 'work_in_progress', 'closed_for_pricing'].includes(co.status)) ||
  (co.org_id === myOrgId && co.status === 'draft')
);
```

## Files Changed
- **Database** — replace `can_request_fc_change_order_input` function (1 migration)
- **`src/hooks/useCORoleContext.ts`** — fix `canRequestFCInput` condition (~2 lines)

## What stays the same
- `CODetailLayout.tsx` — no changes needed, `handleAction('request_fc')` already works
- `COSidebar.tsx` / `FCInputRequestCard.tsx` — no changes
- `useProjectFCOrgs.ts` — already returns FC_Test correctly
- `CONextActionBanner.tsx` — no changes

