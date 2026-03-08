

# Expand Demo Dataset to 10 Projects

## Current State
- 3 projects, 6 work orders (2 each), 3 POs, 6 invoices, 3 contracts, 8 SOV items, 5 RFIs, 12 PO line items, 7 invoice line items, 6 WO details
- ~354 lines in `demoData.ts`

## Target State
- **10 projects** across varied types (residential, commercial, mixed-use, industrial, institutional)
- **~100 work orders** (8-12 per project, mix of draft/active/completed statuses)
- **~40 purchase orders** (3-5 per project)
- **~60 invoices** (5-8 per project, varied statuses)
- **~15 contracts** (1-2 per project)
- **~80 SOV items** (6-10 per project)
- **~40 RFIs** (3-5 per project)
- **~120 PO line items** (3-4 per PO)
- **~120 invoice line items** (2-3 per invoice)
- **~100 WO details** (one per WO)
- **~20 team members** (expanded roster)
- **~30 attention items** (2-4 per project)

## New Projects (7 added to existing 3)

| ID | Name | Type | Build Type | City |
|----|------|------|-----------|------|
| demo-proj-4 | Riverside Medical Center | institutional | new_construction | Dallas, TX |
| demo-proj-5 | Cedar Park Elementary Expansion | institutional | renovation | Cedar Park, TX |
| demo-proj-6 | Westlake Hills Estate | residential | new_construction | Westlake Hills, TX |
| demo-proj-7 | East Side Brewery & Taproom | commercial | renovation | Austin, TX |
| demo-proj-8 | South Congress Retail Center | commercial | new_construction | Austin, TX |
| demo-proj-9 | Mueller Mixed-Use Block 7 | mixed_use | new_construction | Austin, TX |
| demo-proj-10 | Pflugerville Distribution Hub | industrial | new_construction | Pflugerville, TX |

## Implementation
Single file change: rewrite `src/data/demoData.ts` with all expanded arrays. All interfaces and helper functions stay the same — just more data rows. The file will grow from ~354 lines to ~1800-2000 lines.

No other files need changes — all consumers already filter by `project_id` via `getDemoDataForProject()`.

## Data Realism
- Work orders use realistic trade types: framing, electrical, plumbing, HVAC, roofing, concrete, drywall, painting, flooring, fire protection, elevators, steel
- Statuses distributed: ~30% draft, ~40% active, ~20% completed, ~10% cancelled
- Financial figures scale with project type (medical center $2M+, brewery $400K, etc.)
- RFIs reference real construction conflicts (code vs plans, material substitutions, coordination issues)
- Invoice billing periods span Oct 2025 – Feb 2026

