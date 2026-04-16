

# QA Seed Rewrite — 7 Colorado Projects + Full Test Report

## What Changes

Replace the current 12-project Austin-based seed with the user's 7 specific Colorado projects, each with richer document coverage and edge cases.

## Constraint: `home_type` Values

The `project_scope_details.home_type` column has a CHECK constraint limiting values to: `custom_home`, `track_home`, `townhomes`, `apartments_mf`, `hotel_hospitality`, `senior_living`. Projects 3 (Industrial), 4 (Commercial), 6 (TI), and 7 (Medical) don't have direct matches — we'll use `custom_home` for those and set `project_type`/`build_type` to differentiate.

## 7 Projects

| # | Name | Location | Contract | home_type | contract_mode |
|---|------|----------|----------|-----------|---------------|
| 1 | 5 Cherry Hills Park | Cherry Hills Village, CO | $420K | custom_home | fixed |
| 2 | Tower 14 Phase 2 | Denver RiNo, CO | $680K | apartments_mf | fixed |
| 3 | Mesa Logistics Hub | Mesa, AZ | $290K | custom_home | fixed |
| 4 | Apex Retail Center | Aurora, CO | $520K | custom_home | fixed |
| 5 | Hyatt Studios DEN | Denver Airport, CO | $740K | hotel_hospitality | tm |
| 6 | Beacon Heights TI | Lone Tree, CO | $185K | custom_home | tm |
| 7 | Westfield Medical Renovation | Westminster, CO | $340K | custom_home | tm |

## Documents Per Project

Each project gets:
- **2 POs** (one lumber, one hardware/specialty) across statuses: ACTIVE → SUBMITTED → PRICED → ORDERED → DELIVERED
- **2 COs/WOs** with varying pricing_type (fixed/tm/nte) and statuses (draft/submitted/approved/rejected/completed)
- **2 Invoices** (DRAFT/SUBMITTED/APPROVED/REJECTED/PAID distributed across projects)
- **2 RFIs** (one answered, one open)
- **1 Return** on projects with DELIVERED POs

Total: 14 POs, 14 COs, 14 Invoices, 14 RFIs, ~4 Returns.

## Edge Cases Seeded

- Project 1: over-budget CO ($14.5K TC price vs $12K GC budget), rejected invoice with reason
- Project 2: pending FC invite, partial SOV, 4+ concurrent WOs
- Project 3: delivered PO with return/credit + short delivery
- Project 5: T&M mode with WO-driven billing, no SOV
- Project 6: deductive CO (scope removal), invoice exceeding WO value
- Project 7: revised CO (rejected then re-drafted), damaged delivery credit memo

## Supplier Names

The edge function will set `po_name` with realistic supplier references (Cascade Lumber, Ferguson, Dryvit, etc.) but all POs still link to the existing `SUPPLIER_ID` since that's the only supplier record in the system.

## Files Modified

1. **`supabase/functions/seed-qa-environment/index.ts`** — Full rewrite of PROJECTS array (7 instead of 12), updated lumber/hardware items to include MEP fittings and drywall materials, updated CO configs per project, updated invoice configs, updated RFI content. Same clear/seed action structure.

2. **`src/pages/platform/PlatformQA.tsx`** — No structural changes needed; it already reads dynamically from seeded data.

## Test Report

After seeding, I will:
1. Query all 7 projects and verify document counts
2. Check each role's dashboard visibility (GC, TC, FC, Supplier)
3. Verify RLS prevents cross-role data leaks
4. Check budget/KPI reconciliation
5. Output a markdown test report to `/mnt/documents/qa-test-report.md`

## No New Tables or Migrations

All data goes into existing tables. No schema changes.

