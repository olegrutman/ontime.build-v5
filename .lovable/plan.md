
# Fix CO Picker v3 — Role Lock, Exit, and Sidebar

## Problems
1. **Role Switcher visible** — `CORoleSwitcher` shows GC/TC/FC tabs in the header. This is wrong; the role must come from the user's actual project participation, not a manual toggle.
2. **Role not syncing** — `usePickerState` initializes with `detectedRole`, but the participant query is async. The initial render uses a stale default before the query resolves. No `useEffect` syncs the detected role back into state.
3. **No exit** — the back arrow calls `navigate(-1)` which may not work if the user landed directly. Need a reliable "back to CO list" route.
4. **Sidebar always visible** — the picker already renders full-screen (`min-h-screen` grid), but it shares the route context with `ProjectHome` which has `ProjectSidebar`. The picker page is already outside that layout, so the "sidebar" the user sees is likely the `PickerAside` right panel (340px). This is intentional as a summary panel — but on certain screen sizes it may feel stuck. Will verify this is not a `ProjectSidebar` leak.

## Changes

### 1. Remove `CORoleSwitcher` from `PickerShell.tsx`
- Delete the import and the `<CORoleSwitcher>` JSX block from the header (lines 15, 376-378).
- Delete the dead `handleRoleSwitch` callback (lines 299-301).
- Display a small role badge instead (e.g., "Creating as TC") so the user knows their detected role.

### 2. Sync detected role into reducer state
- Add a `SET_ROLE` action to the reducer in `usePickerState.ts` and `types.ts`.
- Add a `useEffect` in `PickerShell` that dispatches `SET_ROLE` when `detectedRole` changes and differs from `state.role`.

### 3. Reliable exit navigation
- Change the back arrow `onClick` from `navigate(-1)` to `navigate(`/project/${projectId}/change-orders`)` so it always goes to the CO list.

### 4. Verify no sidebar leak
- Confirm the route at `/project/:id/change-orders/new` renders `COPickerV3Page` directly (not inside `ProjectHome`). Already confirmed — no fix needed.

### Files Modified
- `src/components/change-orders/picker-v3/PickerShell.tsx` — remove switcher, add role badge, fix back nav, add role sync effect
- `src/components/change-orders/picker-v3/types.ts` — add `SET_ROLE` action type
- `src/components/change-orders/picker-v3/usePickerState.ts` — handle `SET_ROLE` in reducer
