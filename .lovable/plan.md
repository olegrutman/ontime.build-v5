

# Redesign Project Cards: Remove Bar, Add Status + Role-Aware Financials

## What changes

Replace the progress bar and percentage in all 4 dashboard `ProjectCard` components with:
1. **Project status badge** — uses the real `project.status` value (Active, Setup, On Hold, Completed, Archived) instead of the fake progress-derived label
2. **Three financial metrics** shown inline, varying by role:
   - **GC**: Contract | Cost | Margin
   - **TC**: Owner Contract | Cost | Margin  
   - **FC**: Contract | Cost | Margin
   - **Supplier**: PO Value | Ordered | Outstanding

## How it works

Each card already receives `budget` (contract value). We'll add `costs` and `status` props by joining with the existing `projectFinancials` data that's already loaded per-project.

### New ProjectCard props (all 4 files share identical card)
```
name, status, budget, costs, onClick
```
- `status`: raw project status string ("active", "setup", etc.)
- `budget`: contract/revenue value
- `costs`: costs from `projectFinancials`
- Margin is computed inline: `budget - costs`

### Card layout (replacing bar + %)
```text
┌──────────────────────────┐
│ ● Project Name           │
│ Active                   │  ← status pill (real status)
│                          │
│ Contract   Cost   Margin │  ← 3 inline metrics
│ $1.2M      $900K  $300K  │
└──────────────────────────┘
```

## Files to edit

| # | File | Change |
|---|------|--------|
| 1 | `GCDashboardView.tsx` | Update `ProjectCard` — remove bar/progress, add status + 3 metrics. Update call site to pass `status` and `costs` from `projectFinancials`. |
| 2 | `TCDashboardView.tsx` | Same card redesign. Label first metric "Owner Contract" for TC context. |
| 3 | `FCDashboardView.tsx` | Same card redesign. |
| 4 | `SupplierDashboardView.tsx` | Same card redesign. |

### Data flow
The `projectFinancials` array (already fetched in `useDashboardData`) contains per-project `revenue` and `costs`. At the call site, we match `projectFinancials.find(pf => pf.projectId === p.id)` to get costs. The status comes directly from `p.status`.

