# Estimates per Change Order / Work Order

## Where we are today

- One estimate per project, per supplier — but it is **not** a database rule. It is a guard in the supplier estimates page: if an estimate already exists for the chosen project, it refuses to create another and opens the existing one instead.
- The estimate record already has an unused "change order" link field, so the data model is half-ready.
- Everything downstream (material contract value, margin, pre-pack variance, estimate-vs-ordered progress) assumes exactly one project-level estimate is *the* material contract. That is the real reason the guard exists — removing it without touching the rollups would double-count material commitments.

## What we build

**Base estimate + CO/WO estimates.** Each project keeps one base estimate (the original material contract). Every CO/WO can carry its own estimates, tied to that CO/WO. Material commitment for the project = approved base estimate + approved CO/WO estimates, so the numbers stay honest and each CO shows its own material cost.

### 1. Data
- Use the existing change-order link on estimates; add a scope marker (`BASE` vs `CHANGE`).
- Uniqueness enforced in the database, not the UI: one non-voided estimate per project+supplier where there is no CO link (the base), and one per project+supplier+CO (the CO estimate). Multiple revisions handled by superseding, not by piling up drafts.
- Backfill: every existing estimate becomes `BASE`.

### 2. Supplier side
- Create-estimate dialog gains an optional "Attach to Change Order / Work Order" picker (project first, then its COs/WOs). Blank = base estimate.
- The "already exists" guard now only blocks a duplicate *within the same scope* (same project + same CO), and it explains which one it is opening.
- Estimate list groups rows: **Base contract** then **Change orders**, each CO row labelled with its CO number and title.

### 3. CO/WO detail page
- Materials panel gets an estimate zone: request / view / approve the supplier estimate for that CO, plus the estimate-to-PO progress for that CO only.
- CO material cost pulls from its approved estimate, falling back to committed POs (same precedence already used at project level).

### 4. Rollups that must be updated together
- Material contract value = approved base + approved CO estimates (never both an estimate and its own POs for the same scope).
- Margin, revised-out, and cash-flow rows: CO material commitment sits under the party responsible for that CO's materials.
- Pre-pack variance and estimate-vs-ordered: keyed per estimate, with the CO label visible so a CO pack is not mistaken for a base pack.
- Project readiness / supplier dashboard: base estimate still drives "project has a material contract"; CO estimates never gate project setup.

### 5. Access
- A CO estimate is visible to the same parties that can see the CO, plus the supplier that owns it. No new cost exposure to Field Crew.

## Sequence

1. Migration: scope marker, CO link usage, scoped uniqueness, backfill, access rules.
2. Supplier create/list flow with CO attachment.
3. CO detail materials estimate zone.
4. Rollup updates (project material contract, margin, variance, cash flow) + browser verification as GC, TC, and Supplier on a project that has an approved base estimate and one CO estimate.

## Notes / trade-offs

- Keeping a single **base** estimate is deliberate: it preserves "the approved estimate is the material contract" rule you set. If you would rather allow several base estimates per project (phased bids), say so — that changes step 1 and the material-contract math to a sum of all base estimates.
