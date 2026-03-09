

# TC Self-Performing Flag at Project Level

## Understanding

Add an explicit toggle for TCs to declare "I'm self-performing (no FC)" at the project level. Currently this is inferred per work order by checking if an FC participant exists. An explicit flag gives the TC control and unlocks project-level features (budget tracking, actual cost logging) without requiring FC absence detection.

## Implementation

### 1. Database: Add `is_self_performing` to `project_team`

Add a boolean column `is_self_performing` (default `false`) on the `project_team` table. This is the TC's own team row in the project. When `true`, the system treats the TC as self-performing across all work orders in that project.

### 2. UI: Toggle in TeamMembersCard or Overview

Add a toggle/switch on the TC's own row in `TeamMembersCard.tsx` (or a dedicated spot on the Overview page). Only visible to the TC themselves. Label: "Self-Performing (no Field Crew)". Toggling updates `project_team.is_self_performing`.

### 3. Propagate the Flag

- **`useProjectFinancials.ts`**: Fetch `is_self_performing` from `project_team` for the current TC. Expose it so `BudgetTracking` and `ProfitCard` can show the right UI (budget vs actual tracking for self-performing TC, same as FC sees today).
- **`BudgetTracking.tsx`**: Show the Labor Budget card for self-performing TCs (currently only shows for FC). Enable actual cost logging.
- **`ChangeOrderDetailPage.tsx`**: Use project-level flag as fallback/override for `hasFCParticipant` detection on work orders.

### 4. Files

| File | Change |
|------|--------|
| Migration SQL | Add `is_self_performing boolean default false` to `project_team` |
| `TeamMembersCard.tsx` | Add toggle for TC's own row |
| `useProjectFinancials.ts` | Fetch and expose the flag |
| `BudgetTracking.tsx` | Show for self-performing TC |
| `ProfitCard.tsx` | Adjust profit calc for self-performing TC |
| `ChangeOrderDetailPage.tsx` | Use project flag as source of truth |

