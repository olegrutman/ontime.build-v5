# Team access test: realistic job roles across all four company types

## What gets built
A permanent test team for each sandbox company, a set of overlapping project assignments, and an automated check that signs in as every person and records what they can see.

### People (job titles are labels only)
```text
Supplier_Test : Owner (admin), Sales Manager (admin), Inside Sales, Outside Sales,
                Account Manager, Accountant
GC_Test       : Owner (admin), Project Manager 1 (admin), Project Manager 2,
                Superintendent 1, Superintendent 2, Superintendent 3
TC_Test (sub) : Owner (admin), Project Manager (admin), Foreman 1, Foreman 2, Estimator, Bookkeeper
FC_Test (crew): Owner (admin), Crew Lead (admin), Crew Member 1, Crew Member 2, Bookkeeper
```
Everyone except admins is set to "Assigned projects only". Emails use the pattern `access+<company>-<title>@test.com`, all under one shared test password.

### Projects and assignments
Add 3 more sandbox projects (A, B, C) next to Willow Creek, with all four companies on each. Then assign people so they overlap. For example, PM 2 is on A and B, Super 1 is on A, Super 2 is on B and C, and Super 3 is on nothing. The supplier's outside sales is on A, and the accountant is on A, B and C.

### What gets checked, for every person on every project
1. Whether the project appears in their project list.
2. Whether they can open it directly by its link.
3. Whether its change orders, invoices, purchase orders and estimates are hidden when they aren't assigned.
4. That admins see all four projects.
5. That taking someone off a project removes their access right away, and adding them back restores it.

### Result
You get a people × projects table with expected vs actual and PASS/FAIL. It's also saved as a repeatable check so it can be run again after any future change.

## Problem found that needs a fix first
Right now a company can only have **one admin besides its owner**. When a second person is made admin, the first one is quietly demoted. You said sales managers and project managers can be admins, and a GC may have several project managers. The fix is to remove the automatic demotion so a company can have several admins. The safeguard that stops the last admin being removed stays in place.

## Technical details
- Migration: drop `enforce_single_org_admin_trg`, and keep `guard_last_admin`.
- Test users are created through a temporary sandbox-only helper, with profiles and `user_org_roles` (is_admin and project_scope). Assignments go through `project_members`.
- The check runs as each user by signing in with their real session, then querying projects, change_orders, invoices, purchase_orders and supplier_estimates under RLS. It also opens `/project/<id>` in Playwright for a sample of people.
- The results table is written to the Files area.
