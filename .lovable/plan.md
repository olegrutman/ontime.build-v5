

# Fix: Hide Setup Banner When Complete + Improve FC Contract Save Feedback

## Problem 1: "Define Scope & Details" banner always shows
The amber banner in `ProjectHome.tsx` (line 347-361) has **no condition** — it renders for every non-demo, non-supplier user regardless of whether scope and profile are already set up. It should be hidden once the project has a profile and scope selections.

## Problem 2: FC contract save has no visual confirmation
When TC saves the contract price with FC in the Downstream Contracts card, the toast appears but is subtle. The save button doesn't change state to indicate success, and the `project_financials` query isn't invalidated so the overview doesn't immediately reflect the new FC cost.

## Plain English
- The orange "Define Scope & Details" card on the Overview tab will disappear once you've completed the scope wizard. Right now it stays forever — that's the bug.
- When you save the FC contract price, the button will briefly show a checkmark and "Saved!" so you know it worked. The financials on the overview will also refresh immediately.

## Changes

### File: `src/pages/ProjectHome.tsx`
1. Import `useProjectProfile` and `useScopeSelections` hooks (already exist)
2. Fetch profile and scope selections for the project
3. Wrap the banner in a condition: only show when `!profile || scopeSelections.length === 0`

### File: `src/components/project/DownstreamContractsCard.tsx`
1. After successful save, also invalidate `project_financials` query so the overview's Contract Hero and Profit cards update
2. Add a `saved` state that shows a checkmark on the save button for 2 seconds after success
3. Change toast to use a more prominent success style

## Files changed

| File | Change |
|------|--------|
| `src/pages/ProjectHome.tsx` | Conditionally hide "Define Scope & Details" banner when profile and scope exist |
| `src/components/project/DownstreamContractsCard.tsx` | Add `project_financials` query invalidation + visual save confirmation |

