

# Contract Data Integrity Bugs — Audit & Fix

## Bugs Found

### Bug 1: Duplicate Contracts in Database
The project has **4 contracts but should have 2**. Current state:
- TC_Test → GC_Test: $150,000 (trade: "General Contractor") — created by PhaseContracts
- TC_Test → GC_Test: $150,000 (trade: null) — created by AddTeamMemberDialog
- FC_Test → TC_Test: $50,000 (trade: "Field Crew") — created by PhaseContracts
- FC_Test → TC_Test: $50 (trade: "Framer") — created by AddTeamMemberDialog

**Root cause**: `AddTeamMemberDialog` creates a contract with `contract_sum: 0` when a team member is added. Then `PhaseContracts.handleSave` uses `existingContracts.find()` which only matches the FIRST contract — if it matches the one from `AddTeamMemberDialog`, it updates that one. But `.find()` stops at the first match, so if there are already 2 contracts for the same org pair, it updates one and ignores the other. Worse, the detection logic on line 146-150 can match by `to_project_team_id` OR by `org_id`, creating inconsistent behavior.

### Bug 2: `AddTeamMemberDialog` Missing `to_project_team_id` (Search Flow)
The "search existing org" flow (lines 335-359) does NOT set `to_project_team_id` on the contract insert, but the "invite" flow (lines 450-475) does. This breaks the resilient lookup pattern and contributes to duplicates.

### Bug 3: `actual_cost_entries.change_order_id` Column Missing
`useActualCosts.ts` line 119 queries `.is('change_order_id', null)` but this column doesn't exist on the `actual_cost_entries` table. This causes repeated 400 errors visible in network requests.

### Bug 4: `upstreamContract` Picks Wrong Duplicate
`useProjectFinancials.ts` line 397 uses `.find()` without any preference logic. With duplicate TC→GC contracts, it picks whichever comes first from the API — which may be the one with `trade: null` and $150,000 or the one with different values, causing inconsistent display on overview.

## Fix Plan

### 1. `PhaseContracts.tsx` — Deduplicate on Save
- Change `existingContracts.find()` to `existingContracts.filter()` to find ALL matching contracts for a team member
- Update the first match, delete any extra duplicates via supabase `.delete().in('id', extraIds)`
- This self-heals the data on next save

### 2. `AddTeamMemberDialog.tsx` — Add `to_project_team_id` to Search Flow
- After the `project_team` insert (around line 310), capture the returned `teamMember.id`
- Pass it into the contract insert payload at line 335-359 as `to_project_team_id`
- Also add a duplicate check before inserting: query existing contracts for the same org pair + project, skip insert if one already exists

### 3. `useActualCosts.ts` — Remove Nonexistent Column Filter
- Line 119: Remove `.is('change_order_id', null)` since the column doesn't exist
- Just query by `project_id` without the `change_order_id` filter

### 4. `useProjectFinancials.ts` — Prefer Non-null Trade Contracts
- Lines 397-406: After `.find()`, add preference for contracts where `trade` is not null, to consistently pick the "real" contract over the auto-created placeholder
- Or filter out contracts where `trade === null` AND `contract_sum === 0` (placeholder contracts)

### 5. Database Cleanup (Migration)
- Delete duplicate contracts for this project: remove the rows with `trade IS NULL` or `contract_sum = 50` that are clearly stale duplicates
- SQL: `DELETE FROM project_contracts WHERE project_id = 'b861cb9f-...' AND id IN ('9207140c-...', '69c82fef-...')`

## Files Modified
| File | Change |
|------|--------|
| `PhaseContracts.tsx` | Self-heal duplicates on save |
| `AddTeamMemberDialog.tsx` | Add `to_project_team_id` + duplicate guard on search flow |
| `useActualCosts.ts` | Remove `change_order_id` filter |
| `useProjectFinancials.ts` | Prefer non-null trade contracts in `.find()` |
| DB migration | Clean up existing duplicate contract rows |

