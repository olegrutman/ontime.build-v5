

# Understanding & Example: Floor-Based SOV Engine

## What I Have Right Now (Your Live Project Data)

From the network requests, here is the **actual project profile** currently saved:

```text
Project Type:     Custom Home (project_type_id: 7c6bdc09...)
Stories:          1
Basement:         Foundation type = "Basement" (but has_basement = false — likely walkout/slab hybrid)
Framing System:   Pre-Fabricated Walls (Panelized)
Floor System:     Floor Trusses
Roof System:      Pre-Manufactured Trusses
Garage:           Yes, 3-car
Stairs:           Yes
Deck/Porch:       Covered Porch
Buildings:        1
```

**Scope selections from project_profiles:**
| Scope Item | Included | Detail |
|---|---|---|
| WRB | Yes | Zip System |
| Siding | Yes | Hardie |
| Exterior Trim | Yes | Wood |
| Soffit/Fascia | Yes | Wood / Wood |
| Windows Install | No | — |
| Patio Doors | No | — |
| Decks/Railings | No | — |
| Garage Framing | Yes | Trim openings: No |
| Sheathing | No | — |
| Backout | Yes | Blocking (TV, Cabinet, Handrail, Grab Bar, Shelf, Tub/Shower, Specialty), Shimming, Stud Repair, Nailer Plates, Pickup Framing |

**Contracts on this project:**
- TC → GC: $231,651 (Trade Contractor to General Contractor)
- FC → TC: $160,500 (Field Crew to Trade Contractor)

## Where Data Comes From

The SOV engine pulls from **two sources**:

1. **`project_profiles` table** — building structure + scope toggles (framing system, floor system, roof system, stories, basement, garage, and all `scope_*` fields)
2. **`project_scope_selections` + `scope_items` + `scope_sections`** — the granular scope catalog items (currently empty for this project, meaning scope is driven entirely by the profile flags)

## What the Current Engine Does vs. What You Want

**Current**: Flat list of SOV lines grouped by abstract categories ("Foundation", "Interior Framing", "Roof", etc.). No floor-level hierarchy. AI decides everything.

**Your spec**: Floor-based hierarchy where the primary grouping is by **floor level**, then by category within each floor. This mirrors how construction actually happens — you frame Floor 1, then Floor 2, then Roof, then Exterior.

## Example SOV for THIS Project

Based on the spec rules applied to your actual project data:

```text
CONTRACT: TC → GC — $231,651.00

┌─────────────────────────────────────────────────────────┐
│ BASEMENT (25%)                           $57,912.75     │
│  ├─ Layout                    2.5%        $5,791.28     │
│  ├─ Walls (Panelized Install) 10.0%      $23,165.10     │
│  ├─ Sheathing / Zip System     5.0%      $11,582.55     │
│  ├─ Backout — Basement         3.5%       $8,107.79     │
│  │   (Blocking, Shimming, Stud Repair)                  │
│  └─ Hardware & Holdowns        4.0%       $9,266.04     │
│                                                         │
│ FLOOR 1 (30%)                            $69,495.30     │
│  ├─ Layout                    3.0%        $6,949.53     │
│  ├─ Walls (Panelized Install) 12.0%      $27,798.12     │
│  ├─ Floor Trusses + Subfloor   0.0%       — (slab/bsmt) │
│  ├─ Sheathing / Zip System     6.0%      $13,899.06     │
│  ├─ Backout — Level 1          4.5%      $10,424.30     │
│  │   (TV, Cabinet, Handrail, Grab Bar,                  │
│  │    Shelf, Tub/Shower, Specialty,                     │
│  │    Shimming, Stud Repair, Nailer Plates)             │
│  └─ Hardware & Holdowns        4.5%      $10,424.30     │
│                                                         │
│ ROOF (12%)                               $27,798.12     │
│  ├─ Trusses (Pre-Manufactured) 8.0%     $18,532.08     │
│  ├─ Sheathing                  2.5%       $5,791.28     │
│  └─ Fascia / Sub-Fascia        1.5%       $3,474.77     │
│                                                         │
│ EXTERIOR (18%)                           $41,697.18     │
│  ├─ WRB — Zip System           3.0%      $6,949.53     │
│  ├─ Siding — Hardie (Front)    3.0%      $6,949.53     │
│  ├─ Siding — Hardie (Rear)     3.0%      $6,949.53     │
│  ├─ Siding — Hardie (Left)     2.5%      $5,791.28     │
│  ├─ Siding — Hardie (Right)    2.5%      $5,791.28     │
│  ├─ Exterior Trim — Wood       2.0%      $4,633.02     │
│  └─ Soffit & Fascia — Wood     2.0%      $4,633.02     │
│                                                         │
│ GARAGE (8%)                              $18,532.08     │
│  ├─ Garage Framing (3-car)     6.0%     $13,899.06     │
│  └─ Siding — Hardie (Garage)   2.0%      $4,633.02     │
│                                                         │
│ COVERED PORCH (3%)                        $6,949.53     │
│  └─ Porch Framing              3.0%      $6,949.53     │
│                                                         │
│ STAIRS (2%)                               $4,633.02     │
│  └─ Interior Stairs            2.0%      $4,633.02     │
│                                                         │
│ PUNCH / MISC (2%)                         $4,633.02     │
│  ├─ Pickup Framing             1.5%      $3,474.77     │
│  └─ Punchlist                  0.5%      $1,158.26     │
│                                                         │
│ TOTAL                        100.0%     $231,651.00     │
└─────────────────────────────────────────────────────────┘
```

**Key differences from current system:**
- Grouped by FLOOR first, not by abstract category
- Backout items broken out per floor with the specific sub-items (blocking types, shimming, etc.)
- Siding broken out by elevation (Front/Rear/Left/Right + Garage)
- Scope-driven: no Windows line because `scope_windows_install = false`
- Garage as its own section because `scope_garage_framing = true`
- Covered Porch appears because `has_covered_porch = true`

## What Needs to Change

### Database
- Add `floor_label` column to `project_sov_items` (nullable, for floor-level grouping)
- Optionally add `sov_floors` table for floor-level percentage totals and ordering

### Edge Function (`generate-sov/index.ts`)
- Rewrite the AI system prompt to enforce floor-based hierarchy
- Pass all new profile fields (framing_system, floor_system, roof_system, garage_car_count, backout sub-items, scope flags)
- Output format changes: each line includes `floor_label` field

### UI (SOV page)
- Render as expandable tree: Floor → Category → Line Items
- Mobile: card-based with tap-to-expand per floor
- Floor-level progress/completion indicators

### Billing
- Floor completion triggers (already partially supported by existing `percent_complete` on SOV items)

This is a significant refactor of the SOV generation engine, data model, and UI. Want me to proceed with a detailed implementation plan?

