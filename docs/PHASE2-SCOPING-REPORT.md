# Phase 2 — Route project-scoped SELECT access through `can_see_project()`

Status: **complete, observably a no-op.** `npm run build` exit 0, zero TypeScript errors.

Rollback artifacts retained (do NOT drop until Phase 3 is verified):
`public._phase2_policy_backup` (403 rows), `public._phase2_access_baseline` (54 rows),
`public._phase2_conversion_log` (52 rows). All three have RLS enabled with no policies and are
granted only to `service_role` — unreachable from the client.

## Step 1 — Snapshot

| artifact | rows |
|---|---|
| `_phase2_policy_backup` | 403 |
| `_phase2_access_baseline` | 54 |

Note on 54 vs the expected 49: the baseline is keyed per `user_org_roles` row, so users holding
roles in two orgs contribute duplicate pairs. `SELECT DISTINCT user_id, project_id` over it is
exactly **49**, matching the Phase 1 backfill.

## Step 2 — Grants + `projects`

```sql
GRANT EXECUTE ON FUNCTION public.can_see_project(uuid) TO public;
GRANT EXECUTE ON FUNCTION public.projects_visible_via_org(uuid) TO public;

DROP POLICY "Org members can view own projects" ON projects;
CREATE POLICY "Org members can view own projects" ON projects
  FOR SELECT TO public USING ( public.can_see_project(id) );
```

`Participants can view invited projects` and `Platform users can view all projects` untouched.

## Step 3 — Gate (passed)

| check | result |
|---|---|
| baseline rows with no matching `projects` row | 0 |
| users whose visible-project count changed | 0 |
| distinct pairs before / after | 49 / 49 |
| pairs lost | 0 |
| pairs gained | 0 |

## A. Policies converted (35 + 1 replaced)

Every converted policy is `USING ( (<original qual>) AND public.can_see_project(project_id) )`,
or `AND (project_id IS NULL OR public.can_see_project(project_id))` where `project_id` is
nullable. Original role grant preserved verbatim. Original and new quals in full are in
`_phase2_conversion_log.original_qual` / `.new_qual`.

**Replaced (sanctioned exception, Step 2):** `projects :: Org members can view own projects` —
`user_in_org(auth.uid(), organization_id)` → `can_see_project(id)`.

**Batch A (5):**
- `purchase_orders :: Project team and suppliers can view POs` `{public}` — NULL-guarded (`project_id` nullable)
- `change_orders :: Users can access change orders they participate in` `{authenticated}`
- `change_orders :: Users can select owned or assigned change orders (direct)` `{authenticated}`
- `invoices :: Users can view invoices for their contracts` `{public}`
- `project_sov_items :: Users can view SOV items for their contracts` `{public}`

**Batch B (18):** `actual_cost_entries` ×2 (NULL-guarded), `backcharges`, `co_activity`,
`co_ai_intakes` ×2, `co_sov_lines`, `estimate_catalog_mapping`, `gc_owner_billings`,
`payment_applications`, `project_estimates` ×2, `project_rfis`, `project_schedule_items`,
`reminders` (NULL-guarded), `returns`, `rfis`, `supplier_estimates`.

**Batch C (17):** `contract_scope_exclusions`, `contract_scope_selections`, `contract_sow_items`,
`daily_logs`, `field_captures`, `project_activity`, `project_contracts`,
`project_designated_suppliers`, `project_framing_scope`, `project_guests`,
`project_relationships`, `project_scope_assignments`, `project_scope_details`,
`project_scope_selections`, `project_settings_audit`, `project_setup_answers`, `project_sov`.

## B. Policies skipped

**Platform-staff policies (8), excluded by spec:** `purchase_orders`, `change_orders`, `invoices`,
`project_sov_items`, `co_activity`, `supplier_estimates`, `project_contracts`, `project_sov`
— each `Platform users can view …` with qual `is_platform_user(auth.uid())`.

Zero policies were skipped for already referencing `can_see_project` — nothing was double-wrapped.

No INSERT / UPDATE / DELETE policy was touched. `member_permissions`, `project_participants`,
`user_org_roles`, `access_audit_log`, `project_members`, all `*_role_view` views, and every React
file are unchanged.

## C. Tables with a `project_id` column but NO SELECT policy

- **`project_profiles`** — has policies, but none for SELECT. RLS is on, so reads are currently
  denied to all client roles rather than leaking; still worth an explicit decision in Phase 3.

No `project_id`-bearing table lacks policies entirely.

## D. Flagged — NOT converted, needs your decision

**`project_invites :: Users can view invites` `{authenticated}`**
```
(invited_email IN (SELECT email FROM profiles WHERE user_id = auth.uid()))
OR (invited_by_user_id = auth.uid())
```
**`project_team :: Users can view project team` `{public}`**
```
user_is_project_participant(auth.uid(), project_id)
OR (invited_email IN (SELECT email FROM profiles WHERE user_id = auth.uid()))
OR (invited_by_user_id = auth.uid()) OR (user_id = auth.uid())
OR (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()))
```
These are **pre-access read paths**: an invitee matches on `invited_email` precisely *before* their
org is a project participant, so `can_see_project(project_id)` is false for them by construction.
AND-ing it would hide the invite row and break invite acceptance — a real behavior change, which
Hard Constraint "if any behavior changes, stop and report" forbids. Left untouched and reported.
(`project_team :: Platform users can view all project_team` also logged as flagged for grouping;
it is an `is_platform_user` policy and excluded by spec regardless.)

**Inconclusive count verification, conversion still safe:**
`change_orders :: Users can access change orders they participate in` — qual is
`can_access_change_order(id)`, which reads `auth.uid()` *inside* the function, so the offline
harness could not substitute a user and both before/after counts were 0. Conjunction cannot widen
access, so the change is safe by construction, but it was not empirically count-verified.

**One asymmetry worth recording:** `can_see_project()`'s org path is slightly *wider* than
`user_in_org()` — it also matches when the user's org is a row in `project_participants`. On
`projects` that is harmless because `Participants can view invited projects` already grants the
same rows additively (measured: 0 pairs gained). On child tables it cannot widen anything, since
the new predicate is only ever AND-ed.

## E. Verification results per batch

Harness: for each of the 5 users in the baseline, evaluate the original qual (with `auth.uid()`
substituted) and the AND-ed qual as `service_role` with RLS bypassed, then compare counts.

| batch | policies measured | rows before | rows after | users with any loss | eval errors |
|---|---|---|---|---|---|
| A | 5 | 1,152 | 1,152 | 0 | 0 |
| B | 18 | 965 | 965 | 0 | 0 |
| C | 17 | 2,141 | 2,141 | 0 | 0 |

Failure-signature check — SELECT policies on any child table whose qual is *only*
`can_see_project(project_id)` (the signature of replacement instead of conjunction):
**0 rows.**

`npm run build` after each batch: exit 0.

## Linter note

The scanner reports `Public Can Execute SECURITY DEFINER Function` for the two functions granted
to `public` in Step 2, as the prompt specified. Both return `false` immediately when
`auth.uid() IS NULL`, so `anon` gains nothing; revoking `anon` and granting only `authenticated`
would silence it if you prefer. Everything else in the 315 findings pre-dates Phase 2.

Stopping here. Phase 3 (FC-redacted views) not started.
