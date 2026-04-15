

# QA / Demo Test Harness — Implementation Plan

## Existing Accounts (No New Users/Orgs)

| User | Email | Org | Org ID | Org Type | Role |
|------|-------|-----|--------|----------|------|
| John Smith | gc@test.com | GC_Test (GCTEST) | `96a802b8...` | GC | GC_PM |
| Mike Gold | tc@test.com | TC_Test | `ab07e031...` | TC | TC_PM |
| Tim Cook | fc@test.com | FC_Test | `6e563ffc...` | FC | FC_PM |
| Greg Moon | supp@test.com | Supplier_Test | `12b5d7de...` | SUPPLIER | SUPPLIER |

Existing supplier record: `a1b2c3d4-e5f6-7890-abcd-ef1234567890` (Ontime System Supplier, in Supplier_Test org).

Note: gc@test.com has two GC orgs. We use org_code `GCTEST` (`96a802b8...`) as primary.

## What Gets Built

### 1. Edge Function: `supabase/functions/seed-qa-environment/index.ts`

Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. Gated behind PLATFORM_OWNER JWT check (same pattern as `seed-test-users`).

**12 Projects** (2 per type):

| Type | Healthy | Messy |
|------|---------|-------|
| Single Family | Barton Creek Custom Home — 4BR/3BA, 2-story, basement | Dripping Springs Spec Home — missing SOV, rejected invoice, pending FC |
| Townhomes | Lakeline Townhomes Ph1 — 8 units, 3-story | Round Rock Townhomes — partial SOV, revised CO, over-budget |
| Apartments | Domain Apartments Bldg C — 24 units, 4-story | Pflugerville Senior Living — rejected WO, missing approvals |
| Duplex | South Lamar Duplex — 2 units, 2-story | East Riverside Duplex — unordered PO, return credit |
| Hotel | Congress Hotel Renovation — 5-story, 60 rooms | Airport Hotel Express — concurrent WOs, variance |
| Commercial | Tech Ridge Office Park — 3-story, 22k SF | South Congress Retail — disputed invoice, revision loop |

**Per project, the function inserts (in FK order):**

1. `projects` — realistic address, type, scope, structures, `created_by` = gc_test user_id, `organization_id` = GC_Test
2. `project_scope_details` — bedrooms/bathrooms/stories/garage/foundation matching type
3. `project_participants` — GC, TC, FC roles with `invite_status: 'accepted'` (FC = `pending` on messy projects where noted)
4. `project_team` — team members for each user with `status: 'Accepted'`
5. `project_contracts` — GC↔TC upstream (from_role=GC_PM, to_role=TC_PM), TC↔FC downstream (TC_PM→FC_PM), realistic contract_sum and labor_budget
6. `project_sov` + `project_sov_items` — 7-phase SOV on healthy projects; missing/partial on messy
7. `suppliers` record reuse (existing `a1b2c3d4...`) + `project_designated_suppliers` linking
8. `purchase_orders` + `po_line_items` — 3-5 POs per project covering ACTIVE/SUBMITTED/PRICED/ORDERED/DELIVERED statuses
9. `change_orders` + `co_scope_items` + `co_line_items` + `co_labor_entries` — 3-6 per project, mixed pricing_type (fixed/tm/nte), mixed statuses
10. `co_material_items` — on COs with materials_needed
11. `invoices` + `invoice_line_items` — 2-4 per project covering DRAFT/SUBMITTED/APPROVED/REJECTED/PAID
12. `project_rfis` — 1-2 per project (open + answered)
13. `returns` + `return_items` — on messy projects with delivered POs

**Realistic content**: lumber descriptions (2x6x16 SPF #2, LVL 1-3/4x11-7/8x24, 3/4 CDX Plywood), hardware (Simpson HDU2, USP LTP4), scope items (wall framing, header install, soffit/fascia), CO reasons (owner requested, blueprint change, damage by others), location tags matching project type.

**Edge cases explicitly seeded:**
- Accepted TC / pending FC
- Missing SOV
- Approved WO with no invoice
- Rejected invoice with rejection_reason
- Revised CO (status back to DRAFT after rejection)
- Supplier-priced PO not ordered
- Delivered PO + return credit
- 4+ concurrent WOs
- Over-budget CO (gc_budget < tc_submitted_price)

**Clear function**: Also supports `{ action: 'clear' }` to delete all seeded data by matching `created_by` = gc_test user_id for projects, then cascade.

### 2. Admin Page: `src/pages/platform/PlatformQA.tsx`

- Route: `/platform/qa`
- Two buttons: "Seed QA Environment" and "Clear QA Data"
- Summary table showing all test projects with:
  - Name, type, status
  - Role chain indicators (GC/TC/FC/Supplier connected)
  - Document counts (POs, COs/WOs, Invoices, RFIs, Returns)
  - Status breakdown badges
  - Edge case flags
- Fetches data from `projects` joined with counts from each document table, filtered by gc_test's created_by

### 3. Config & Routing Updates

- `supabase/config.toml` — add `[functions.seed-qa-environment]` with `verify_jwt = false`
- `src/App.tsx` — add lazy import for `PlatformQA` and route `/platform/qa`
- `src/components/platform/PlatformSidebar.tsx` — add nav item `{ to: '/platform/qa', icon: FlaskConical, label: 'QA Test' }`

## Files Created/Modified

1. **New**: `supabase/functions/seed-qa-environment/index.ts` (~1200 lines)
2. **New**: `src/pages/platform/PlatformQA.tsx` (~300 lines)
3. **Modified**: `supabase/config.toml` — 3 lines added
4. **Modified**: `src/App.tsx` — 2 lines added (import + route)
5. **Modified**: `src/components/platform/PlatformSidebar.tsx` — 1 nav item added

## No Production Impact

- All data created with `created_by` = gc_test user_id
- Existing tables/RLS/triggers unchanged
- Edge function gated behind PLATFORM_OWNER auth
- Clear button removes only seeded data

