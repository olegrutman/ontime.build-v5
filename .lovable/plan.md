

# Add Self-Performing Toggle to Profit Position Card

## What Changes

### 1. `ProfitCard.tsx` -- TC Section
- Add a Switch toggle in the card header next to "Profit Position" label, visible only for TC viewers
- Label: "Self-Performing"
- Toggling updates `project_team.is_self_performing` in the database (same logic as TeamMembersCard)
- When toggled on, `BudgetTracking` card automatically appears (already handled by existing `isTCSelfPerforming` check in `BudgetTracking.tsx`)

### 2. Wire the toggle to database
- Import `supabase` client and `useAuth` to get current org
- On toggle change, update `project_team.is_self_performing` for the TC's row
- Call `financials` refetch or use the existing `onTeamChanged` pattern to propagate the state change

### 3. No changes needed to `BudgetTracking.tsx`
- It already checks `isTCSelfPerforming` and shows the Labor Budget card when true
- The profit calculation in ProfitCard already handles self-performing mode

### Files

| File | Change |
|------|--------|
| `src/components/project/ProfitCard.tsx` | Add Switch toggle in TC section header, wire to DB update |

