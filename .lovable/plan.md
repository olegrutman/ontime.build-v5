

# CO Component Audit — Explain Back and Fix Plan

## Findings Confirmed

### Critical Bugs

**BUG 1 — refreshDetail() is a no-op in COSlideOver.tsx**
Line 99-101: `function refreshDetail() { // re-fetch via react-query invalidation happens from the hooks }`. It literally does nothing. Every `onRefresh` callback from COStatusActions, COMaterialsPanel, COEquipmentPanel, COLineItemRow, CONTEPanel, and FCPricingToggleCard calls this empty function. After fix: it will call `queryClient.invalidateQueries({ queryKey: ['co-detail', coId] })` and `queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] })`, exactly mirroring CODetailPage.tsx line 106-108.

**BUG 2 — totalValue always $0**
Line 70: `let totalValue = 0;` — never reassigned. After fix: `totalValue = changeOrders.reduce((sum, co) => co.status !== 'draft' ? sum + (co.tc_submitted_price ?? 0) : sum, 0)`. Display formatted as currency in the stats KPI (replacing the "Total COs" count box with "Total CO value" dollar display).

**BUG 3 — my_action filter too narrow**
Current filter (line 87-89) only catches `submitted && org_id === orgId`. Missing: `closed_for_pricing` where user's org is creator or assignee, and `work_in_progress` where assigned to user's org. After fix: `(status === 'submitted' && org_id === orgId) || (status === 'closed_for_pricing' && (org_id === orgId || assigned_to_org_id === orgId)) || (status === 'work_in_progress' && assigned_to_org_id === orgId)`. The `my_action` filter pill count will also use this expanded logic.

**BUG 4 — Pulsing dot always navy**
Lines 92-95: hardcoded `bg-primary` on every card. After fix: status-mapped colors — `submitted` → amber, `closed_for_pricing` → yellow, `work_in_progress`/`draft`/`shared` → blue, `approved` → green, `rejected` → red, `contracted` → gray.

**BUG 5 — Tab state resets on every panel open**
Line 53: `useState('details')` always initializes to `'details'`. After fix: read from `localStorage` key `co_tab_${coId}` on mount, write on tab change.

**BUG 6 — Only one avatar on cards**
Lines 114-122: only `created_by_role` avatar rendered. After fix: also render `assigned_to_org` role avatar (TC if GC created, GC if TC created). The `ChangeOrderWithMembers` type has `collaboratorStatus` and `collaboratorOrgId` — if collaborator exists, also render FC avatar.

### Design Fixes

**FIX 1 — Who's Here bar missing**
`useCORealtime(coId)` is called but only invalidates queries — no presence UI. Will add a `COWhosHere` component between header and role banner in COSlideOver. Uses Supabase Realtime Presence on channel `co-presence-{coId}`. Shows user initials in role-colored circles, count label, and right-aligned activity text that updates based on presence state (e.g., `{ activeTab: 'pricing', role: 'TC' }` → "TC is entering pricing…"). Clears after 5s idle.

**FIX 2 — COStatusActions renders as heavy card in panel header**
Currently on lines 164-174, COStatusActions renders its full card shell (own header, padding) inside the panel header section. Fix: render only the primary + secondary action buttons inline in the header row (h-8, text-xs compact buttons). Move the full COStatusActions card into the Details tab only.

**FIX 3 — Location shortcut in StepCatalog**
After the first item is confirmed with a location, show a banner: "Last location: [tag] — Apply to next item?" with Yes/No. Yes pre-fills the location fields for the next item. Implemented as state in StepCatalog tracking `lastLocationTag` and `lastLocationData`.

**FIX 4 — Mobile overlay issues**
On mobile (<768px), remove the backdrop overlay (panel covers 100vw anyway). Add a back arrow button in the panel header for mobile navigation. Keep overlay + click-to-close on desktop.

**FIX 5 — FC share toggle missing context**
StepConfig lines 364-368: FC role shows "Share immediately" with no target. Fix: resolve TC org name from `assignedToOrgId` (already available as `selectedTcName` in GC flow but not passed to FC). Label becomes "Share with [TC name] immediately", hint: "If off, [TC name] cannot see this CO until you share it."

**FIX 6 — Rejected progress bar**
Line 35: `rejected: 0.3` same as `work_in_progress`. Fix: `rejected: 0` with red progress bar color (`#DC2626`) instead of stripe color.

### NTE Audit

**Verify 1 — Hard block fires before warning**
Lines 108-112: The 100% hard block (`return` with error toast) fires BEFORE the 95% warning check on lines 114-117. A user entering labor that pushes from 96% to 101% gets the hard block toast immediately, never seeing the warning UI. Fix: if `ntePercent >= 100` and `!showNTEWarn`, set `showNTEWarn = true` instead of hard-blocking. The warning dialog (line 353-385) already shows the 100% text ("You will exceed the cap"). Only hard-block if they try to confirm when already AT 100% before the current entry (i.e., `nteUsed / nteCap >= 1` with zero new entry).

**Verify 2 — Notification failure could surface as save error**
Lines 136-211: notification calls are inside the same `try` block as the save. They're already wrapped in inner `try-catch` blocks (lines 144-175 and 178-209 each have `catch { /* non-critical */ }`). This is actually correct — notification failures are caught and suppressed. No fix needed.

### Code Quality

**ISSUE 1 — Duplicate role resolution**
COSlideOver.tsx lines 66-97 and CODetailPage.tsx lines 88-101 are near-identical. Extract `useCORoleContext(coId, projectId)` returning `{isGC, isTC, isFC, role, myOrgId, myOrgName, canEdit, canRequestFCInput, canCompleteFCInput, nteBlocked, pricingType, collaboratorOrgIds, currentCollaborator, fcCollabName}`.

**ISSUE 2 — Stats reorder**
After Bug 2 fix, reorder KPIs: Total CO value ($) | Pending approval (count) | Awaiting pricing (count) | Approved & billable ($). Approved & billable sums `tc_submitted_price` for `approved` status COs.

**ISSUE 3 — getStripeColor priority inverted**
Lines 22-28: `reason` checked before `pricing_type`. A T&M CO with `reason: 'addition'` gets blue instead of purple. Fix: check `pricing_type` first (`tm` → purple, `nte` → amber), then `reason` (`addition` → blue, `rework`/`design_change` → amber, `damaged_by_others` → red). `fixed` with `addition` stays blue (reason wins when pricing_type is fixed).

## Assumptions

1. The `ChangeOrderWithMembers` type doesn't carry `assigned_to_org_role` directly — I'll infer it: if `created_by_role` is GC, the assigned org is TC; if TC, assigned is GC. FC avatar shown when `collaboratorOrgId` exists.
2. For the Who's Here bar, I'll track presence via `supabase.channel().track()` — no table changes needed.
3. The COStatusActions "inline buttons" extraction will create a lightweight `COInlineActions` sub-component that renders at most 2 buttons, reusing the same permission logic.
4. For StepConfig FC share label, the TC org name comes from the project's TC membership. Since FC doesn't select a TC in the wizard (the CO is assigned by TC), I'll resolve it from `data.assignedToOrgId` if set, or fall back to "TC".
5. NTE Verify 2 is already handled correctly — no change needed.

## Execution Order

**Group 1 — Critical Bugs (6 items):**
1. BUG 1: Fix refreshDetail in COSlideOver
2. BUG 2: Calculate totalValue in COListPage stats
3. BUG 3: Expand my_action filter
4. BUG 4: Status-mapped pulsing dot colors
5. BUG 5: Persist tab state per CO
6. BUG 6: Multi-role avatars on cards

**Group 2 — Design Fixes (6 items):**
1. FIX 1: Add Who's Here bar
2. FIX 2: Inline action buttons in panel header
3. FIX 3: Location shortcut in StepCatalog
4. FIX 4: Mobile overlay + back arrow
5. FIX 5: FC share toggle label
6. FIX 6: Rejected progress bar

**Group 3 — NTE Audit (1 fix):**
1. Reorder hard block / warning flow in LaborEntryForm

**Group 4 — Code Quality (3 items):**
1. Extract useCORoleContext hook
2. Reorder stats KPIs
3. Fix getStripeColor priority

## Files Affected

| File | Changes |
|------|---------|
| `src/components/change-orders/COSlideOver.tsx` | BUG 1, 5; FIX 1, 2, 4 |
| `src/components/change-orders/COListPage.tsx` | BUG 2, 3; ISSUE 2 |
| `src/components/change-orders/COBoardCard.tsx` | BUG 4, 6; FIX 6; ISSUE 3 |
| `src/components/change-orders/LaborEntryForm.tsx` | NTE Verify 1 |
| `src/components/change-orders/wizard/StepConfig.tsx` | FIX 5 |
| `src/components/change-orders/wizard/StepCatalog.tsx` | FIX 3 |
| `src/hooks/useCORoleContext.ts` | New — ISSUE 1 |
| `src/components/change-orders/CODetailPage.tsx` | ISSUE 1 (use new hook) |

