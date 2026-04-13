

# Fix: FC-Created COs Missing from FC and TC Pages

## Problem

Two bugs with FC-created Change Orders:

1. **FC can't see their own COs** — The FC home screen (`FCHomeScreen.tsx`) only displays COs where the FC is an invited collaborator. It completely ignores COs where `org_id` matches the FC's organization (i.e., COs the FC created themselves).

2. **TC still can't see FC-created COs** — The existing CO in the database (`d50f80af`) was created before the wizard fix and has `assigned_to_org_id` set to the GC org instead of the TC. New COs created after the wizard fix should route correctly, but the visibility logic in `useChangeOrders.ts` also needs a fallback for the TC to see COs from their downstream FC.

## Fix

### 1. FCHomeScreen — Show FC's own COs
**File: `src/components/change-orders/FCHomeScreen.tsx`**

Add a second list section below "Open COs requiring your input" that shows COs where `co.org_id === orgId` (COs the FC created). These should be displayed as a simple card list with status, title, and click-through navigation, similar to how `COListPage` renders cards.

### 2. useChangeOrders — TC sees downstream FC COs
**File: `src/hooks/useChangeOrders.ts`**

In the visibility grouping loop (line ~120), add a condition: if the current org is a TC and the CO's `org_id` belongs to a downstream FC on this project, treat it as a "sharedWithMe" CO. This requires checking against the project contracts data.

A simpler approach: fetch the project's contract chain in the query function. If there's a contract where `to_org_id === currentOrgId` and `from_org_id === co.org_id`, the current org is upstream of the CO creator and should see it.

### 3. Fix existing bad data
**Migration** — Update the existing FC-created CO (`d50f80af`) to set `assigned_to_org_id` to the TC org (`ab07e031`) instead of the GC org. This is a one-time data fix.

Alternatively, skip the migration and rely on the visibility logic fix in step 2, which will handle both old and new COs.

## Files Changed
- `src/components/change-orders/FCHomeScreen.tsx` — add "My Change Orders" section showing FC-created COs
- `src/hooks/useChangeOrders.ts` — add downstream-org visibility check so TC sees FC-created COs

