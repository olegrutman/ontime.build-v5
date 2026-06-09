## Problem

A supplier-created project is a "shell": name, address, building structure (type, stories, foundation, sqft) — no contract, no SOV, no scope, no team beyond the supplier. When a GC or TC accepts the supplier's estimate, the project needs to become a real PM project without forcing the supplier to know anything about contracts they aren't party to.

## Concept: Two-Stage Project Lifecycle

```text
[Supplier Shell]  ──estimate accepted──▶  [Adopted]  ──completion wizard──▶  [Fully Set Up]
   structure only        + buyer joins       + supplier↔buyer contract       + buyer's own contract,
                         + first contract     scope, SOV, team, mode
```

Two key moments:
1. **Adoption** (automatic on estimate accept) — minimum data so the project works for materials/PO/billing between supplier and buyer.
2. **Completion** (buyer-driven, optional but prompted) — fills the rest if the buyer wants full PM features.

## Stage 1 — Adoption (automatic, on first estimate acceptance)

Triggered when a GC or TC clicks "Accept" on a supplier estimate.

What happens server-side in one transaction:
- Insert `project_participants` row for the accepting org (role = GC or TC, status = ACCEPTED).
- Create a `project_contracts` row: `from_role = Supplier`, `from_org_id = supplier`, `to_role = GC|TC`, `to_org_id = buyer`, `contract_sum = estimate.total`, `status = active`. This is the "contract" the supplier never had to enter.
- Set a new flag on `projects`, e.g. `setup_completion_required = true`, owned by the buyer org. Status stays `active` (project remains usable for materials immediately).
- Notify the buyer: "You've adopted [Project] from [Supplier]. Add your contract & scope to unlock dashboards."

At this point the buyer can already: issue POs against the supplier's estimate, log deliveries, post invoices on the supplier↔buyer contract. They just don't have their own SOV or upstream contract yet.

If a second buyer later accepts a different supplier estimate on the same project, only an additional supplier↔buyer contract row is created — no second promotion. (Edge case, rare.)

## Stage 2 — Completion Wizard (buyer-driven)

First time the buyer opens the adopted project, show a persistent **"Finish project setup"** banner at the top of `ProjectOverview` (dismissible but not removable until completed). Banner CTA opens a focused wizard that reuses pieces of `CreateProjectNew` but skips what the supplier already provided.

Wizard steps for the buyer:

| Step | Notes |
|---|---|
| Confirm Basics | Name + address pre-filled, read-only (supplier-provided). Building info pre-filled but editable. |
| Contract Mode | Fixed vs T&M (buyer's choice). |
| Contracts | Buyer's upstream contract value (GC↔Owner if GC; GC↔TC if TC, plus optional TC↔FC). Supplier↔buyer contract is already created — shown as a read-only summary row. |
| Scope | Standard SOV wizard, seeded by the building info the supplier already entered (skip foundation/stories/sqft questions). |
| Team | Invite teammates, downstream contractors, FCs. |
| Review | Same as today. |

On finish: `setup_completion_required = false`, normal project flow resumes.

## What "fully functional" means for each role

- **Supplier** (creator): never loses access; sees the project, its estimates, POs, returns, invoices — only the supplier↔buyer slice. Doesn't see the buyer's upstream contract, SOV, or labor.
- **Buyer** (GC/TC who accepted): gets full PM features once completion wizard runs. Can edit scope/SOV/team. Becomes the project's "primary" contractor.
- **Other roles invited later** (TC, FC, other suppliers): added through normal team flow inside the completed project.

## Data & schema changes

- `projects.setup_completion_required boolean default false` — flips to `true` on adoption, `false` after completion wizard finishes.
- `projects.adopted_from_supplier_org_id uuid null` — provenance, lets the buyer see "Adopted from [Supplier]".
- Reuse existing `project_contracts`, `project_participants`, `project_sov`, `project_scope_details`. No new tables.
- DB trigger or edge function on `supplier_estimates` status transitioning to `accepted` performs the adoption insert atomically.
- RLS: buyer's full read access kicks in via the new `project_participants` row (existing `is_project_participant` already covers this). Supplier's pre-existing access stays scoped via the supplier-visibility policies.

## UI surfaces

- **Adoption banner** on `ProjectOverview` while `setup_completion_required = true`: amber, with "Finish setup" CTA and a "Materials only — skip for now" secondary link.
- **Read-only ribbon** on the basics/building-info cards while in adopted-but-incomplete state: "Provided by [Supplier]. You can edit after finishing setup."
- **Sidebar gating**: SOV, Invoices (non-supplier), CO/WO, Schedule tabs show a small lock chip with tooltip "Complete project setup to unlock" until the wizard finishes. Materials/POs/Estimates are unlocked from day one.
- **Empty-state dashboards**: KPIs that depend on a contract sum show "—" with a hint linking to the completion wizard.

## Out of scope

- Multi-buyer competitive estimate flows.
- Automatic SOV generation from a supplier's line-item estimate (future: AI could seed scope from estimate items, but that's a separate effort).
- Migrating already-existing supplier shells created before this change — handled by a one-time backfill if needed.
