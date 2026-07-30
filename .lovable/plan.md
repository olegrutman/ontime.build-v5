## Phase 1 — Per-user project scoping (additive, behaviorally inert)

Pre-flight check against the live database confirms none of the new objects exist, so nothing needs to be aborted or renamed:

- Tables `project_members`, `access_audit_log` — absent (also no `org_members` / `role_permissions` / `project_orgs`).
- Columns `user_org_roles.project_scope`, `organizations.default_project_scope` — absent.
- Functions `projects_visible_via_org`, `can_see_project`, `seed_project_creator`, `guard_last_admin` — absent.
- Triggers `projects_seed_creator`, `uor_guard_admin_delete`, `uor_guard_admin_update` — absent.
- Existing helpers `user_in_org`, `user_is_project_participant` — present, untouched.
- 43 public tables carry a `project_id` column (relevant to the Phase 2 inventory in the report).

One thing the prompt didn't anticipate: **`create_organization_and_set_admin` has two overloads** (differing argument order: `p_org_name text, org_type, ...` vs `org_type, text, ...`). Both will be updated identically in Step 4; neither signature changes.

### What gets built

**Migration 1 — schema (Steps 1, 2, 6)**
- `project_members` (project_id, user_id, organization_id, status, added_by) with the unique constraint and both indexes.
- `user_org_roles.project_scope` default `'org'`; `organizations.default_project_scope` default `'org'`.
- `access_audit_log` + its two indexes.
- GRANTs on both new tables (`authenticated`, `service_role`) — required before RLS is meaningful.
- `projects_visible_via_org(uuid)` and `can_see_project(uuid)` exactly as specified, SECURITY DEFINER, `search_path = public`, execute granted to `authenticated`.
- RLS enabled on the two new tables only, with policies `pm_select`, `pm_write`, `audit_select`, `audit_insert` as written.
- No RLS policy on `projects` (or any existing table) is touched. `project_participants` and `member_permissions` untouched.

**Migration 2 — behavior preservation (Steps 4, 5)**
- `seed_project_creator()` + `projects_seed_creator` AFTER INSERT trigger on `projects`.
- `guard_last_admin()` + the delete/update triggers on `user_org_roles`.
- Rewrite of `accept_org_invitation`, `approve_join_request`, and **both** `create_organization_and_set_admin` overloads so the `user_org_roles` insert stamps `project_scope` from that org's `default_project_scope`. No signature or other behavior changes. (For `create_organization_and_set_admin` the org is created in the same call, so the stamp reads the freshly inserted row's default, which is `'org'` — preserving current behavior.)

**Backfill (Step 3)** — run as a data operation, not a migration: one `INSERT … SELECT DISTINCT … ON CONFLICT DO NOTHING` from `user_org_roles` cross-joined against `projects_visible_via_org`. Inserted row count reported.

**Verification (Step 7)**
- `npm run build` (via the repo's build) — zero TypeScript errors. No React/route/component files change, so this is a regression check only.
- The zero-row verification query comparing `projects_visible_via_org` against `project_members`.

### Report produced at the end

Markdown covering: (A) any failed statement + exact error; (B) backfill row count and verification result; (C) full definitions of every RLS policy on `projects`, `purchase_orders`, `change_orders`, `invoices`, and all remaining `project_id`-bearing tables; (D) every table/column holding cost / unit_cost / price / markup / margin; (E) post-edit definitions of the three (four, counting the overload) org-role functions.

Stops there. No Phase 2 policy changes.

### Technical notes

- Migrations run through the approval flow; the backfill and all reporting queries run separately afterward since `project_members` must exist first.
- `can_see_project` is defined but referenced only by the new tables' own policies, so no existing read path changes. Every user keeps `project_scope = 'org'`, which short-circuits Path A identically to today's `user_in_org` behavior.
- `guard_last_admin` is a real behavior change in one narrow case: removing/demoting the final admin of an org will now raise instead of succeeding. This is intended by the spec but is the only non-inert element of Phase 1.
