

# Full Platform Stress + Logic + Permission Test Plan

## Overview

This plan seeds the Ontime.Build platform with a comprehensive multi-organization test dataset: 4 organizations, 7 users, 10 projects, 50 work orders, invoices, purchase orders, RFIs, and edge-case permission tests -- all via SQL migrations executed as SECURITY DEFINER to bypass RLS (since we're seeding data, not simulating user sessions).

**Important limitation**: Some tests (concurrency, real-time permission blocking) cannot be fully simulated via SQL alone. Those will be documented with manual test scripts for you to execute in the UI.

---

## Phase 1: User + Organization Setup

### Existing State
- `gc@test.com` (id: `ef6822a5`) -- GC_PM in two GC orgs, **is_admin = false** in both
- `tc@test.com` (id: `5ee21ec7`) -- TC_PM in TC_Test, is_admin = true
- `fc@test.com` (id: `038e7252`) -- FC_PM in FC_Test, is_admin = true
- `supp@test.com` (id: `2844b6d1`) -- SUPPLIER in Supplier_Test, is_admin = true

### Actions
1. **Fix gc@test.com admin status**: Set `is_admin = true` for gc@test.com in the primary GC org (`96a802b8` -- the original GC_Test)
2. **Create 3 new auth users** via edge function (cannot create auth users via SQL migration):
   - `gc1@test.com` -- will be added to GC_Test org as GC_PM (non-admin team member)
   - `tc1@test.com` -- will be added to TC_Test org as TC_PM (non-admin team member)
   - `fc1@test.com` -- will be added to FC_Test org as FC_PM (non-admin team member)
3. **Create profiles and org roles** for the new users
4. **Create a Supplier record** in the `suppliers` table tied to TC_Test org (for PO testing)

### Org Reference IDs
| Org | ID | Type |
|-----|----|------|
| GC_Test (primary) | `96a802b8-72a4-42e5-aa00-b7c675a9bb62` | GC |
| TC_Test | `ab07e031-1ea7-4ee9-be15-8c1d7a19dcd6` | TC |
| FC_Test | `6e563ffc-32f1-4f52-a8f9-95e274cad56f` | FC |
| Supplier_Test | `12b5d7de-1bd1-431d-9601-93ba3d56870b` | SUPPLIER |

---

## Phase 2: Create 10 Projects

All created by `gc@test.com` under GC_Test org.

| # | Name | Type | Build | Units | Material Resp. | Supplier? | Status Target |
|---|------|------|-------|-------|---------------|-----------|---------------|
| 1 | TEST - Apartments Alpha | commercial | new_construction | 20 | GC | Yes | active (all accepted) |
| 2 | TEST - Apartments Beta | commercial | new_construction | 40 | TC | Yes | active (all accepted) |
| 3 | TEST - Apartments Gamma | commercial | renovation | 60 | GC | No | setup (TC pending) |
| 4 | TEST - Townhomes Delta | residential | new_construction | 6 | TC | Yes | active (all accepted) |
| 5 | TEST - Townhomes Epsilon | residential | addition | 12 | GC | No | setup (FC pending) |
| 6 | TEST - SFR Zeta | residential | new_construction | 1 | TC | Yes | active (all accepted) |
| 7 | TEST - SFR Eta | residential | renovation | 1 | GC | No | active (all accepted) |
| 8 | TEST - SFR Theta | residential | new_construction | 1 | TC | No | setup (all pending) |
| 9 | TEST - Custom Home Iota | residential | new_construction | 1 | GC | Yes | active (all accepted) |
| 10 | TEST - Custom Home Kappa | residential | addition | 1 | TC | No | setup (TC pending) |

For each project:
- Insert into `projects` table
- Insert `project_participants` for GC (auto-accepted), TC, FC, and optionally Supplier
- Insert `project_team` rows with appropriate statuses
- Insert `project_contracts` (TC->GC contracts with contract sums)
- Insert `project_sov` and `project_sov_items` (3-5 SOV line items per contract)
- Insert `project_relationships` (GC_TC, TC_FC)
- For accepted projects: set participant `invite_status = 'ACCEPTED'`, project `status = 'active'`
- For pending projects: leave some participants as `INVITED`, project stays `setup`

Contract sums will range from $50,000 to $500,000. Retainage set at 5-10%.

---

## Phase 3: Create Work Orders (50 total, 5 per project)

For each of the 10 projects:
- 3 Fixed Price work orders (pricing_mode = 'fixed')
- 2 T&M work orders (pricing_mode = 'tm')

Status distribution across all 50:
- 15 in `draft`
- 10 in `ready_for_approval`
- 10 in `approved` (which auto-converts to `contracted` via trigger)
- 5 in `rejected`
- 10 in `contracted` (completed flow)

Each work order gets:
- `change_order_participants` entries (TC + FC)
- For fixed price: `change_order_tc_labor` entries with hours and rates
- For fixed price with materials: `change_order_materials` entries
- `change_order_checklist` auto-created via trigger
- Location data with varied inside/outside, levels, rooms

---

## Phase 4: Create Invoices

For the 6 active projects with contracts:
- 2-3 invoices per contract
- Mix of statuses: DRAFT, SUBMITTED, APPROVED, REJECTED
- Invoice line items tied to SOV items
- Retainage calculations applied (5-10% of billed amount)
- Some invoices with partial billing (30-50% of scheduled value)

Total: ~15-20 invoices

---

## Phase 5: Create Purchase Orders

For projects where TC is material-responsible (projects 2, 4, 6, 8, 10):
- 3 POs per active project (projects 2, 4, 6 = 9 POs)
- Create a supplier record tied to Supplier_Test org
- Each PO gets 3-5 line items with descriptions, quantities, UOMs
- Status distribution: ACTIVE, SUBMITTED, PRICED, ORDERED, DELIVERED
- Set `pricing_owner_org_id` = TC org (since TC is material-responsible)
- Set `created_by_org_id` = TC org

For GC-responsible projects (1, 3, 5, 7, 9):
- 2 POs for active ones (projects 1, 7, 9 = 6 POs)
- `pricing_owner_org_id` = GC org

Total: ~15 POs

---

## Phase 6: Create RFIs

For each of the 10 projects:
- 3 RFIs (30 total)
- Mix of:
  - `OPEN` (unanswered, various priorities)
  - `ANSWERED` (with answer text and answered_by)
  - `CLOSED` (resolved)
- Submitted by different orgs (TC submitting to GC, GC submitting to TC)
- Various priorities: LOW, MEDIUM, HIGH, URGENT

---

## Phase 7: Edge Case Documentation

These tests cannot be automated via SQL but will be documented as manual test scripts:

### Concurrency Test
- Log in as `tc@test.com` in two browser tabs
- Both tabs open the same contract invoice page
- Both click "Create Invoice" at the same time
- Verify: system prevents duplicate invoice numbers or shows conflict error

### Permission Violation Tests (Manual)
| Test | Actor | Expected Result |
|------|-------|----------------|
| FC views TC pricing | `fc@test.com` | Pricing columns hidden/empty |
| Supplier edits approved PO | `supp@test.com` | Update blocked by RLS |
| TC edits approved invoice | `tc@test.com` | Update blocked by RLS |
| GC sees TC-owned PO pricing | `gc@test.com` | Unit prices hidden |
| Overbilling attempt | `tc@test.com` | System blocks or warns |
| Uninvited org accesses project | Any non-participant | RLS blocks SELECT |

---

## Phase 8: Dashboard Validation

After data is seeded, verify via queries:
- Financial totals aggregate correctly per project
- Retainage math is consistent
- No cross-org data leakage (each org only sees their projects)
- Notification badges reflect pending items

---

## Implementation

### Step 1: Edge Function for User Creation
Create an edge function `seed-test-users` that:
- Creates `gc1@test.com`, `tc1@test.com`, `fc1@test.com` via Supabase Admin API
- Creates their profiles
- Assigns org roles (non-admin team members)
- Password for all: `Test1234!`

### Step 2: SQL Migration
A single large migration that:
1. Fixes gc@test.com admin status
2. Creates supplier record
3. Creates 10 projects with full team/participant/contract/SOV setup
4. Creates 50 work orders with participants, labor, materials
5. Creates ~18 invoices with line items
6. Creates ~15 purchase orders with line items
7. Creates 30 RFIs
8. Creates trusted_partners entries between orgs

### Step 3: Validation Queries
Run post-seed queries to verify:
- Correct record counts per table
- Financial totals match expectations
- RLS isolation (query as each user)

---

## Expected Deliverables

1. Edge function `seed-test-users` for creating the 3 new user accounts
2. SQL migration seeding all project data (projects, contracts, SOVs, work orders, invoices, POs, RFIs)
3. Summary report of what was created
4. Manual test script for concurrency and permission edge cases
5. All data labeled with `TEST -` prefix and left in the database

---

## Technical Notes

- The `convert_change_order_to_contract` trigger fires when a work order status changes to `approved`, auto-creating contracts and SOVs. For seeded data, we'll insert work orders directly at their target status to control the data, but we need to be careful: inserting directly as `approved` will fire the trigger. We'll handle this by either:
  - Inserting as `draft` first, then updating to target status (for ones we want the trigger to fire)
  - Or inserting contracted work orders directly with their contract/SOV data already created
- RFI `rfi_number` is an integer that auto-increments per project -- we'll set these manually
- Invoice numbers must be unique -- we'll use a `TEST-INV-XXXX` format
- PO numbers must be unique -- we'll use a `TEST-PO-XXXX` format

