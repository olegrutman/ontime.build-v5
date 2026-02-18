

# FC Invites: Show Status but Don't Block Setup

## What Changes

Currently, if a Field Crew (FC) organization hasn't accepted their invite, it blocks the "All invites accepted" checklist item and lowers the readiness percentage. This prevents the project from reaching 100% readiness.

**New behavior:**
- FC pending invites will **not** count toward the blocking "All invites accepted" check
- A separate, **informational** checklist item will show FC acceptance status (e.g., "FC accepted: ABC Crew" or "FC invited: ABC Crew (pending)")
- This item will update to show a checkmark once the FC accepts, but it won't affect the readiness percentage either way

## Technical Changes

### `src/hooks/useProjectReadiness.ts`

1. **Filter FC out of the blocking logic** (lines 52-61): When calculating `pendingOrgs` and `allAccepted`, exclude participants with `role === 'FC'`. Only GC, TC, and SUPPLIER invites block readiness.

2. **Add a separate informational FC item**: After the main checklist items, add an optional item (only if FC participants exist) that shows their acceptance status. This item will be marked `complete` when accepted but will **not** be included in the percentage calculation.

3. **Update the `ReadinessItem` interface**: Add an optional `informational?: boolean` flag so the UI can distinguish blocking items from informational ones.

4. **Update percentage calculation** (line 97-98): Exclude items with `informational: true` from the completed/total count.

### `src/components/project/ProjectReadinessCard.tsx`

- Informational items render with a lighter style (e.g., info icon instead of red X when incomplete) to visually distinguish them from blocking items.

## Result

- FC acceptance no longer blocks project activation
- The setup page still shows whether FC has accepted, giving visibility without creating a bottleneck
- GC, TC, and Supplier invites continue to block as before

