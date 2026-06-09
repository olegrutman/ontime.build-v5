# Make "Finish project setup" reliable for buyers

## Why your project shows no banner
`Oleg Rutman` was created by a Supplier and the GC joined through a team invite. No `supplier_estimate` was ever submitted or accepted, so the DB trigger that sets `projects.setup_completion_required = true` never ran. The banner is gated on that flag, so it stays hidden — even though the project is exactly the kind of shell that needs buyer completion.

The current adoption model assumes *every* buyer arrives by approving an estimate. In reality, a buyer may:
1. Approve a supplier estimate (already handled).
2. Accept a direct project invite from a supplier (not handled).
3. Be added later, after the supplier already submitted an estimate (race-condition).

## Fix

### 1. Flag projects at creation time, not only at estimate approval
Update the `projects` insert trigger (or add one): when `created_by_org` is a Supplier, set `setup_completion_required = true` and stamp `adopted_from_supplier_org_id = created_by_org_id`. This guarantees every supplier-originated project is flagged the moment it exists.

### 2. Keep estimate-approval trigger but make it idempotent
The existing `adopt_project_on_estimate_approval` trigger stays — it still creates the `project_participants` + `project_contracts` rows on first estimate acceptance. It just no-ops the flag flip (already true).

### 3. Auto-clear the flag when buyer has a contract + scope
Add a guard so the flag auto-clears when both exist for the viewing buyer org:
- `project_contracts` where `to_role` = the buyer's role, and
- `project_scope_details` row present and `home_type` not null.

That way if a buyer completed the wizard manually elsewhere, the banner disappears without manual intervention.

### 4. Frontend: broaden banner visibility
In `ProjectHome.tsx` the gate becomes: show the banner when **either** of these is true for the viewing org:
- `project.setup_completion_required === true`, OR
- viewer org is GC/TC AND project was created by a Supplier AND viewer has no `project_contracts` row as `to_role`.

The second clause is a safety net so any pre-existing supplier shell (like `Oleg Rutman`) lights up immediately without a backfill migration.

### 5. Backfill (one-shot migration)
`UPDATE projects SET setup_completion_required = true, adopted_from_supplier_org_id = created_by_org_id WHERE created_by_org_id IN (SELECT id FROM organizations WHERE type = 'SUPPLIER') AND setup_completion_required IS NOT TRUE;` — then immediately apply the auto-clear logic from step 3 so already-completed projects don't get falsely re-flagged.

## Files to touch
- `supabase/migrations/*` — new migration with creation-time trigger, auto-clear helper, backfill.
- `src/pages/ProjectHome.tsx` — broaden banner condition (~line 343).
- No changes needed to `FinishProjectSetup.tsx` (the wizard already clears the flag on finish).

## Out of scope
- Changing supplier UI / restricting what suppliers can configure (handled previously).
- SOV auto-generation from supplier estimates.
