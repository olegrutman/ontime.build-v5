# CO Routes & Rules — Bug Report

I traced every CO entrypoint in `src/App.tsx`, the four CO pages (`COListPage`, `CONewIntake`, `COAiIntake`, `COGuidedBuilder`, `COPickerV3`), and the `AddItemsChooser`/`NewCOChooserDialog` launchers. Here is what I found, in priority order. **No code changed** — this is a report. Tell me which items to fix and I'll come back with the implementation plan.

---

## 🔴 P0 — Crash / runtime broken

### 1. `COGuidedBuilder` violates Rules of Hooks → React error #310
In `src/pages/COGuidedBuilder.tsx`:

```text
~141  useMemo(scenarioLineIdsKey, …)
~146  useEffect(setSelectedLines, …)
 150  if (!projectId) return <Navigate …/>     ← early return
 151  if (!v4)        return <Navigate …/>     ← early return
 160  useMemo(groupedScenarios, …)             ← hook AFTER conditional return
 …    further useMemo / useCallback below
```

When the `v4` flag flips, the hook count changes and React throws **#310** ("Rendered fewer hooks than expected"). This matches the runtime error already in the console logs (`COGuidedBuilder-…js` in the stack). The page is unmountable for any user without the v4 flag enabled.

**Fix:** move every `if (…) return <Navigate />` to the top of the component, above all hooks.

---

## 🟠 P1 — Routing / dead code

### 2. `src/pages/COAiIntake.tsx` is orphaned
`App.tsx` routes both `/change-orders/new` and `/change-orders/intake` to `CONewIntakePage`. `COAiIntake` is never imported by the router; nothing reaches it. Either delete it or route `/change-orders/intake` to it as originally intended. Right now we ship two near-identical intake pages and only one is reachable.

### 3. CO list page has no top-level route
There is no `Route path="/project/:id/change-orders"` in `App.tsx`. The list is reached only via `ProjectHome` rendering `<COListPage>` when `activeTab === 'change-orders'`. Several places `navigate('/project/.../change-orders')` (e.g. `CONewIntake` cancel, `COGuidedBuilder` cancel, `COAiIntake` cancel) — those land on `ProjectHome` which then redirects via its own tab logic. Works today, but fragile: any direct deep-link without the tab state lands on overview. Add an explicit route or normalize the back/cancel targets.

### 4. `NewCOChooserDialog` vs `AddItemsChooser` divergence
- `NewCOChooserDialog` (new CO) → voice = opens `VoicePNRecorder` modal in-place.
- `AddItemsChooser` (add to existing CO) → voice = `navigate('/intake?coId=…&mode=voice')` and auto-starts voice inside `CONewIntake`.

Two different mental models for the same action. Pick one — preferably the in-place recorder for both, since the intake page round-trip is heavier.

### 5. `hideBottomNav` regex misses guided + intake
`App.tsx` line 175:
```ts
if (/\/change-orders\/(new|[^/]+\/add)/.test(pathname)) return null;
```
It hides the mobile bottom nav on `/new` and `/:coId/add-items` but **not** on `/guided` or `/intake`. Both are full-screen wizards with their own fixed bottom action bars, so the global bottom nav stacks on top of them on mobile.

---

## 🟡 P2 — Rules / data correctness

### 6. `addToCoId` flow re-creates a CO instead of appending
`CONewIntake.tsx` reads `?coId=` as `addToCoId` but the create mutation still calls `generateCONumber` + `change_orders.insert`. The "Open" navigation goes to `addToCoId` if present (line 363), but the new CO was already created and orphaned. Need to branch: when `addToCoId` is set, **append `co_line_items` to the existing CO** and skip `change_orders.insert`. (Same issue exists for the manual-picker escape route at line 330.)

### 7. `COListPage.openNewPicker` is unused but still wired
`openNewPicker` navigates to `/change-orders/new`, but the visible button now opens `NewCOChooserDialog`. Dead handler; safe to remove so the entry points stay clean.

### 8. Voice route confusion
`COListPage.handlePickMode('voice')` opens `VoicePNRecorder` locally, but if a user hits `/change-orders/intake?mode=voice` directly (e.g. from a notification or shared link), `CONewIntake` auto-starts a different voice component. Pick a single canonical voice entry.

### 9. Guided builder cancel target
`COGuidedBuilder` cancel button → `/project/:id/change-orders` (list). `CONewIntake` cancel does the same. But `COPickerV3` (full picker) cancels back to wherever it came from. Inconsistent UX. Standardize: cancel always returns to the CO list tab.

---

## 🟢 P3 — Smaller cleanups

- `CONewIntake.tsx` line 1 imports `useMemo` but I don't see it used in the trimmed view — verify with a lint pass.
- `RequireAuth` wraps every CO route except `/external/co/:token` (correct) and `/change-orders/quick` uses `:projectId` while every other CO route uses `:id`. Param mismatch makes `useParams<{ id: string }>()` return undefined inside `QuickCapture` if it expects `id`.
- `co_activity` insert in `COGuidedBuilder` uses `actor_role` derived from `myParticipant?.role`; if the user is GC-only-by-org and not a project participant yet, `role` falls back to `'TC'` silently. Should reject creation instead.

---

## Recommended fix order

1. **P0/#1** — unblock the guided builder (hook order fix).
2. **P1/#5** — hide bottom nav on guided + intake.
3. **P2/#6** — make `addToCoId` actually append.
4. **P1/#2, #4, #3** — collapse the two intake pages and the two voice entry points, add the explicit list route.
5. **P2/#9, P3** — consistency polish.

Want me to proceed with #1 + #5 + #6 in one pass (the user-visible breakages), and queue the consolidation work (#2/#3/#4) separately?
