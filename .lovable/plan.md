
Plain-English understanding:
- You want a full audit of the change-order hooks/components, then the confirmed bugs fixed in order, then defensive guards added, then a smoke test helper and manual verification pass.
- This is a logic/stability pass only: no UI redesign, no export renames, no schema/RLS/type changes.

What I found in the current code:
- Bugs 1–10 are all present in the current codebase.
- There are also checklist mismatches in the hooks:
  - `useChangeOrders.sharedWithMe` currently includes every non-owned CO, not only COs assigned to the current org.
  - `useChangeOrderDetail.financials.nteUsedPercent` returns `null`, not `0`, when cap is missing/zero.
  - `useChangeOrderDetail` orders materials by `line_number`, not `created_at`.
  - `useWorkOrderCatalog` uses only 10-minute `staleTime`, not 1 hour.
- `useCORealtime` already looks mostly correct and should be annotation-only unless a deeper issue appears during compile.

Implementation plan:
1. Fix Phase 1 bugs one by one, compiling after each:
   - `CODetailPage.tsx`: correct `canEdit`, add safe pricing narrowing, and null-safe financial rows.
   - `wizard/COWizard.tsx`: replace dynamic Supabase imports with static import, add rollback delete if line item insert fails, disable Back while submitting.
   - `COStatusActions.tsx`: change `isCreator` to user-id based, add assigned-party guard in `doSubmit`.
   - `COListPage.tsx`: move `STATUS_ORDER` to module scope and add null-safe age handling in both row and card renderers.
   - `CONTEPanel.tsx` + `CODetailPage.tsx`: pass NTE mutations down as props, remove duplicate `useChangeOrderDetail` call, stop refetching CO metadata inside `notifyCreator`.
   - `COMaterialsPanel.tsx` + `useChangeOrderDetail.ts`: remove `materials.length` callback dependency, stop writing `line_number` in picker insert, order materials by `created_at ASC`.
   - `LaborEntryForm.tsx`: add cancellation cleanup to the async hourly-rate effect.

2. Complete the hook audit and fix missing logic before annotating:
   - `useChangeOrders.ts`
     - keep invalidation behavior,
     - tighten `sharedWithMe` to `assigned_to_org_id === currentOrgId && org_id !== currentOrgId`,
     - wrap mutation fns in try/catch where needed so failures are explicit and don’t become silent promise rejections.
   - `useChangeOrderDetail.ts`
     - keep combined-member fetch logic,
     - return `nteUsedPercent = 0` when no/zero cap,
     - preserve actual-cost exclusion from labor totals,
     - keep `materialsTotal` based on `billed_amount`,
     - ensure all subqueries stay scoped to the active CO or combined-member IDs only.
   - `useWorkOrderCatalog.ts`
     - keep search across `item_name`, `category_name`, `division`,
     - raise `staleTime` to 1 hour,
     - verify global rows remain visible and return shape stays `[]` by default.
   - `useCORealtime.ts`
     - verify subscriptions/cleanup as-is and annotate inline.

3. Add the inline audit markers requested:
   - Add `// ✓ verified` next to items that are already correct after fixes.
   - Add `// ✗ MISSING — fix needed` only where a checklist item still requires code, then resolve it in the same pass so the final state is fully annotated and clean.

4. Add smoke-test helper:
   - Create `src/hooks/__tests__/coSmoke.ts` with the exact console assertions you specified.
   - Temporarily wire it into a development-only `useEffect` entry point (likely `App.tsx`) to run after each bug-fix phase, then remove that temporary trigger once validation is done.

5. Final verification pass:
   - Re-check compile after each bug/guard batch.
   - Run the smoke helper and confirm console output after each phase.
   - Then manually verify the 7 browser scenarios you listed, focusing on:
     - approved/contracted T&M/NTE edit lockout,
     - correct Shared-with-me routing,
     - NTE warning/increase realtime flow,
     - combine flow,
     - rollback on wizard line-item failure,
     - creator-only action visibility across same-role users.

Primary files involved:
- `src/components/change-orders/CODetailPage.tsx`
- `src/components/change-orders/wizard/COWizard.tsx`
- `src/components/change-orders/COStatusActions.tsx`
- `src/components/change-orders/COListPage.tsx`
- `src/components/change-orders/CONTEPanel.tsx`
- `src/components/change-orders/COMaterialsPanel.tsx`
- `src/components/change-orders/LaborEntryForm.tsx`
- `src/hooks/useChangeOrders.ts`
- `src/hooks/useChangeOrderDetail.ts`
- `src/hooks/useWorkOrderCatalog.ts`
- `src/hooks/useCORealtime.ts`
- `src/hooks/__tests__/coSmoke.ts`

Expected outcome:
- Approved/contracted COs stop allowing labor entry.
- CO creation becomes rollback-safe.
- Creator-only actions respect actual user identity.
- Hook memoization/query behavior is stabilized.
- The audit checklist is documented inline in the hooks.
- Smoke tests and manual scenarios give a clear ship/no-ship signal without changing UI or backend schema.
