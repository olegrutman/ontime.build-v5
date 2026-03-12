

# Dashboard Project Card -- Bug Report and Math Analysis

## Bugs Found

### Bug 1: Schedule items include phases/milestones in critical count
**File:** `useProjectQuickStats.ts` line 89-91
The query fetches ALL `project_schedule_items` without filtering by `item_type`. The table has an `item_type` column (e.g., "task", "milestone", "phase"). Phases and milestones should not be counted as "critical schedule items" -- only tasks should. A phase with `progress < 100` and `end_date` approaching will show up as a false alarm.

**Fix:** Add `.eq('item_type', 'task')` to the schedule query, or at minimum filter out phases.

### Bug 2: Schedule percent uses items WITHOUT end_date for averaging, then filters them out for critical
**File:** `useProjectQuickStats.ts` lines 134-148
`activeSchedule` filters for items with `end_date`, which is correct. But the schedule percent averages ALL items with an `end_date` equally, regardless of whether they're phases or tasks. A phase at 0% and its child tasks at 100% would show misleading progress. This is inconsistent with how the schedule tab computes progress.

### Bug 3: Budget math double-counts when multiple contracts exist
**File:** `useProjectQuickStats.ts` lines 120-129
`budgetTotal` sums ALL contracts' `contract_sum`. But `invoices` are fetched project-wide without filtering by contract. If a project has a TC->GC contract ($150K) and an FC->TC contract ($100K), `budgetTotal = $250K`. But invoices from the FC to the TC and from TC to GC are different money flows. A TC user sees a budget of $250K which is meaningless -- their relevant budget is only the $150K contract they have with the GC. The query needs to filter contracts by `orgId` (e.g., contracts where `from_org_id = orgId` or `to_org_id = orgId`).

### Bug 4: Outstanding billing math is wrong
**File:** `useProjectQuickStats.ts` lines 125-129
`outstandingBilling = totalBilled - paidAmount`. Here `totalBilled` includes ALL non-DRAFT invoices (SUBMITTED + APPROVED + PAID + REJECTED). REJECTED invoices should NOT be included in `totalBilled`. A rejected $50K invoice inflates the outstanding amount by $50K.

**Fix:** Filter out REJECTED invoices from `totalBilled`:
```typescript
const totalBilled = invoices
  .filter(i => i.status !== 'REJECTED')
  .reduce((s, i) => s + (i.total_amount ?? 0), 0);
```

### Bug 5: KPI tiles conditionally hidden, breaking grid layout
**File:** `ProjectQuickOverview.tsx` lines 249-281
The 3-column grid renders 1, 2, or 3 tiles depending on data. If `budgetTotal === 0` and `outstandingBilling > 0` and `schedulePercent > 0`, you get 2 tiles in a 3-column grid, creating an awkward gap. Same if only 1 tile renders.

**Fix:** Use `grid-cols-2` or `grid-cols-1` dynamically based on visible tile count, or always show all 3 tiles (with "$0" / "0%" for empty values).

### Bug 6: Schedule KPI hidden when progress is exactly 0%
**File:** `ProjectQuickOverview.tsx` line 266
`{stats.schedulePercent > 0 && (` -- if the schedule exists but no tasks have started (all at 0%), the schedule tile is hidden entirely. The user sees no schedule info even though tasks exist and may be overdue.

**Fix:** Check `activeSchedule.length > 0` instead, or pass a `hasSchedule` boolean.

### Bug 7: "All Clear" state shows incorrectly when there ARE critical schedule items
**File:** `ProjectQuickOverview.tsx` lines 233-238
The "All Clear" banner shows when `hasActions === false && !hasCritical`. But if `actionItems` is empty and `criticalScheduleItems` has items, the "All Clear" won't show (correct). However, if both are empty but there's a schedule that's 10% behind, the user sees "All clear" with a "BEHIND" badge on the project row -- contradictory signals.

### Bug 8: `orgId` is passed to hook but never used in queries
**File:** `useProjectQuickStats.ts` line 60, 340
The hook accepts `orgId` in options and includes it in the `useEffect` dependency array, but never uses it in any query. This means:
- TC/FC see ALL project invoices, not just their own
- PO filtering doesn't check if the PO belongs to the user's org
- Work orders aren't filtered by org

This makes action items inaccurate -- a TC could see GC-to-owner invoices counted as "unpaid."

### Bug 9: `formatCurrency` in ProjectQuickOverview duplicates the one in utils.ts
**File:** `ProjectQuickOverview.tsx` lines 26-30, `ProjectRow.tsx` lines 56-63
There are now 3 separate `formatCurrency` functions (utils.ts, ProjectQuickOverview.tsx, ProjectRow.tsx). The one in ProjectQuickOverview rounds `$1,500` to `$2K` (integer division) while utils.ts would show `$1,500`. Inconsistent display.

## Summary of Fixes Needed

| # | Severity | Fix |
|---|----------|-----|
| 1 | Medium | Filter schedule query by `item_type = 'task'` |
| 2 | Low | Use weighted schedule progress or filter by task type |
| 3 | **High** | Filter contracts by user's org for budget calculation |
| 4 | **High** | Exclude REJECTED invoices from totalBilled |
| 5 | Low | Dynamic grid columns based on visible tile count |
| 6 | Medium | Show schedule tile when schedule exists, even at 0% |
| 7 | Low | Align "All Clear" with scheduleDelta check |
| 8 | **High** | Use `orgId` to filter invoices, POs, WOs by the user's org |
| 9 | Low | Use shared `formatCurrency` from utils.ts |

