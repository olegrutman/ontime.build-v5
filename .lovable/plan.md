

## What I learned

I pulled live data for **Main Street Apartments** and verified the math end-to-end:

### Project-level (what the card shows)
| Field | Value |
|---|---|
| Estimate (tax-inc) | $116,607.76 |
| Ordered (tax-inc, sum of 2 POs) | $11,113.28 |
| Used | 9.5% |
| Risk pill | **On Track** ✅ |

The card's math is **technically correct** at the project-rollup level. With only 2 POs out of 15 packs ordered, the project total is nowhere near the estimate.

### Pack-level (what's actually happening)
| Pack | Estimate | Ordered (tax-inc) | Variance |
|---|---|---|---|
| Basement Framing | $4,684.01 | $5,998.64 | **+28% 🔴** |
| Walkout | $2,172.16 | $4,967.70 | **+128% 🔴** |

Both ordered POs are **dramatically over their respective pack estimates**, but the Project Budget Forecast aggregates everything to project totals — so two over-budget packs hidden inside a 90% un-ordered project look "On Track."

### Root cause
The card uses **project-level totals** (`Σ estimate vs Σ ordered`). It does not compare ordered POs against the **pack budgets they were actually drawn from**. The data exists (`source_pack_name` on every PO, `pack_name` on every estimate item — both linked to `source_estimate_id`) — `MaterialsCommandCenter.tsx` already does this calc per-project. The dashboard hook simply doesn't carry it forward.

### Why the existing risk logic misses it
Current logic in `useSupplierDashboardData.ts` L590–597 + `SupplierDashboardView.tsx` L85–87:
```
overBy = max(0, projectOrdered − projectEstimate)
risk = overBy ≤ 0 → 'On Track' | overPct ≤ 5 → 'Watch' | else 'Over Budget'
```
A project can have any number of overspent packs and still report `overBy = 0` until the project's *cumulative* ordered crosses the *full* estimate.

---

## Fix (minimal, two files)

### 1. Compute pack-level variance in the hook
In `useSupplierDashboardData.ts`, after the existing per-PO loop:
- Fetch `supplier_estimate_items` (estimate_id, pack_name, line_total) for the supplier's APPROVED estimates (already partially done elsewhere — reuse the query).
- Build `packEstimate[projectId][packName] = Σ line_total`.
- Build `packOrdered[projectId][packName] = Σ po_total × (1+tax)` from the POs already iterated.
- Per project, compute:
  - `packsOverCount` = # packs where `ordered > estimate`
  - `packOverBy` = Σ `max(0, ordered − estimate)` across over-budget packs
- Add three fields to `SupplierProjectFinancial`: `packsOverCount`, `packOverBy`, `worstPackPct`.

### 2. Upgrade risk logic in `SupplierDashboardView.tsx`
Make risk the **worse of project-level OR pack-level**:
```
risk = max(projectRisk, packRisk)
  packRisk = packsOverCount === 0 → On Track
           | worstPackPct ≤ 5      → Watch
           | else                  → Over Budget
```
Display tweaks in the table:
- "Extra / Over" column shows `+$packOverBy (N pack(s))` when project rollup is $0 but packs are over.
- Tooltip on the Risk pill: `"2 packs over: Basement Framing +28%, Walkout +128%"`.

### Result for Main Street Apartments
Pill flips from `On Track` → `Over Budget`, "Extra / Over" shows `+$3,210.17 (2 packs)`, matching what `MaterialsCommandCenter` already shows on the project page.

### Files modified
- `src/hooks/useSupplierDashboardData.ts` — add pack aggregation (~25 lines)
- `src/components/dashboard/SupplierDashboardView.tsx` — combined risk + display (~15 lines)

### Files NOT touched
- DB schema, RLS, types — all data already exists
- `MaterialsCommandCenter.tsx` — already correct, used as reference

### Verification
- Main Street Apartments forecast row → Risk = `Over Budget`, Extra/Over shows `+$3,210` with "2 packs" hint.
- Projects with no over-budget packs continue to show `On Track`.
- Totals row sums `packOverBy` consistently with row values.

