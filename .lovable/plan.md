

# QA / Demo Test Harness — Full Seed System

## Overview
Build a `seed-qa-environment` edge function (invoked by platform owner) that creates 12 projects across 6 building types, populates the full GC→TC→FC→Supplier chain, and seeds every document type with realistic construction data. Add a `PlatformQA.tsx` admin page to view and trigger the seed.

## Existing Test Infrastructure
- **Users already exist**: `gc@test.com`, `tc@test.com`, `fc@test.com`, `supp@test.com`
- **Orgs already exist**: GC_Test, TC_Test, FC_Test, Supplier_Test with correct types
- No projects exist for these accounts yet — clean slate

## Architecture

### 1. New Edge Function: `supabase/functions/seed-qa-environment/index.ts`
Single large function using `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). Protected by PLATFORM_OWNER JWT check (same pattern as `seed-test-users`).

**What it seeds (in order):**

#### A. 12 Projects (2 per type)
| Type | Healthy Project | Messy Project |
|------|----------------|---------------|
| Single Family | "Barton Creek Custom Home" — 4BR/3BA, 2-story, basement, attached garage | "Dripping Springs Spec Home" — missing SOV, rejected invoice, pending FC |
| Townhomes | "Lakeline Townhomes Ph1" — 8 units, 3-story, shared walls | "Round Rock Townhomes" — partial SOV, revised CO, over-budget |
| Apartments | "Domain Apartments Bldg C" — 24 units, 4-story, elevator | "Pflugerville Senior Living" — rejected WO, missing approvals |
| Duplex | "South Lamar Duplex" — 2 units, 2-story each | "East Riverside Duplex" — supplier PO priced not ordered, return credit |
| Hotel | "Congress Hotel Renovation" — 5-story, 60 rooms | "Airport Hotel Express" — multiple concurrent WOs, variance |
| Commercial | "Tech Ridge Office Park" — 3-story, 22k SF | "South Congress Retail" — disputed invoice, revision loop |

#### B. Per Project — Full Relationship Chain
For each project, insert:
- `projects` row with realistic address, type, scope, structures
- `project_scope_details` with bedrooms/bathrooms/stories/garage matching type
- `project_participants` — GC_Test (GC), TC_Test (TC), FC_Test (FC) with accepted status
- `project_team` — team members mapped to users with accepted status
- `project_contracts` — GC↔TC upstream contract, TC↔FC downstream contract with realistic values
- `project_sov` + `project_sov_items` — 7-phase SOV for healthy projects, missing/partial for messy
- `suppliers` + `project_designated_suppliers` — Supplier_Test linked where materials involved

#### C. Per Project — Documents & Workflows

**Purchase Orders** (3-5 per project):
- Estimate-based lumber PO (ORDERED status, priced by supplier)
- Manual framing hardware PO (PRICED, supplier-edited line prices)
- Draft PO (DRAFT)
- Delivered PO with return credit (messy projects)
- Pack-based PO with modified lines
- Each with 3-8 `po_line_items` using realistic lumber/hardware descriptions

**Change Orders / Work Orders** (3-6 per project):
- GC-originated CO: approved, fixed price, with `co_line_items`
- TC-originated WO: T&M pricing, FC labor entries in `co_labor_entries`
- Pending approval WO with materials needed
- Rejected CO with `rejection_note` (messy)
- Revised CO (second submission after rejection)
- Completed WO with `tc_submitted_price` and markup
- Each with realistic scope items (header install, wall framing, soffit repair, etc.)

**Invoices** (2-4 per project):
- SOV progress invoice (APPROVED, with `sov_invoice_lines` linking to SOV items)
- WO-based invoice (SUBMITTED)
- Rejected invoice with `rejection_reason` (messy)
- PAID invoice
- Each with `invoice_line_items` matching SOV or WO line items
- Retainage calculated at project's retainage_percent

**RFIs** (1-2 per project):
- Open RFI: "Blueprint discrepancy — beam size at kitchen header"
- Answered RFI: "Material substitution for exterior trim"
- Each assigned between orgs

**Returns** (messy projects only):
- Return with `return_items` linked to delivered PO line items
- Credit memo with restocking fee

#### D. Realistic Content Examples
- Lumber: "2x6x16 SPF #2 Studs", "LVL 1-3/4x11-7/8x24", "3/4 CDX Plywood 4x8"
- Hardware: "Simpson HDU2 Hold-down", "USP LTP4 Tie Plate", "1/2x10 Anchor Bolt"
- Scopes: "Interior wall framing — 2nd floor bedrooms 1-3", "Exterior soffit/fascia — front elevation"
- CO reasons: "Owner requested", "Blueprint change", "Damage by others", "Design conflict"
- Locations: "2nd Floor, Bedroom 2", "Basement, Utility Room", "Unit 4B, Kitchen"

### 2. New Admin Page: `src/pages/platform/PlatformQA.tsx`
- Route: `/platform/qa`
- Add to platform nav
- Shows summary table of all seeded projects with:
  - Project name, type, status
  - Role chain status (GC/TC/FC/Supplier)
  - Count of POs / COs / WOs / Invoices / RFIs
  - Document status breakdown (draft/submitted/approved/rejected/paid)
  - Edge case flags (missing SOV, rejected items, pending approvals)
- "Seed QA Environment" button that calls the edge function
- "Clear QA Data" button to delete all seeded test data (by `created_by` = gc@test.com user ID)
- Loading states and result display

### 3. Platform Nav Update
- Add "QA Test" entry to the platform sidebar/nav linking to `/platform/qa`

## Edge Cases Explicitly Covered
- Project with accepted TC but pending FC invite
- Project with no SOV created
- Project with approved WO but no invoice yet
- Project with rejected invoice (with reason)
- Project with revised change order (2 submissions)
- Project with supplier-priced PO not yet ordered
- Project with delivered PO and return credit
- Project with 4+ concurrent work orders
- Project with over-budget variance (CO total exceeds GC budget)
- Pricing visibility: TC material markup hidden from GC view
- FC labor entries visible only to TC, not GC

## Data Integrity
- All UUIDs generated via `crypto.randomUUID()` in the edge function
- Foreign keys respected in insertion order
- Contract `from_role`/`to_role` set correctly (GC_PM→TC_PM, TC_PM→FC_PM)
- SOV items sum to 100% of contract value
- Invoice line totals match SOV scheduled values
- Retainage computed from project retainage_percent

## Files Created/Modified
1. **New**: `supabase/functions/seed-qa-environment/index.ts` — ~1500 lines, the core seed logic
2. **New**: `src/pages/platform/PlatformQA.tsx` — QA summary dashboard
3. **Modified**: `supabase/config.toml` — add `[functions.seed-qa-environment]` with `verify_jwt = false`
4. **Modified**: Platform nav/routing to add QA page link

## No Production Impact
- All data tied to test user IDs — zero overlap with real users
- Edge function gated behind PLATFORM_OWNER auth
- Existing tables/RLS/triggers unchanged
- Clear button deletes only seeded data

