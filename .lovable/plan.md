
# Compact Overview: Reduce Vertical Space, Fit More Above the Fold

## Problem
The overview page stacks three full-width cards before any real content: **AttentionBanner** (amber alert, ~80px), **HealthBanner** (red/amber alert, ~80px), and **5 KPI tiles** (~70px). Combined with `space-y-4` gaps and `py-6` padding, the actual 8/4 grid (POs, CO Impact, Billing) gets pushed well below the fold on a 970px viewport.

The "notifications are too large" refers to the AttentionBanner and HealthBanner — they're styled as full-width notification cards with generous padding that duplicate information already shown in the header stat row (Health status).

## Changes

### 1. Merge AttentionBanner + HealthBanner into a single compact inline bar
**`ProjectHome.tsx`**: Replace the two separate banner components with one slim horizontal bar:
- Single row, ~40px tall, with inline pills: `"2 Invoices to review"` `"1 PO awaiting pricing"` `"High outstanding balance"` — all as small clickable chips
- Amber background if attention items exist, red tint only if health is at-risk
- No title text ("3 items need your attention" / "Project health is at risk") — the pills are self-explanatory
- If no items, render nothing (same as current)

### 2. Tighten content spacing
**`ProjectHome.tsx`**:
- Change `space-y-4 mt-4` to `space-y-3 mt-3` on the overview content wrapper
- Change `py-4 sm:py-6` to `py-3 sm:py-4` on the content container

### 3. Compact KPI row
**`ProjectFinancialCommand.tsx`**: Reduce gap from `gap-3` to `gap-2` and reduce vertical padding inside KPICard if possible

### 4. Lower grid breakpoint
**`ProjectHome.tsx`**: Change the 8/4 grid from `xl:grid-cols-12` to `lg:grid-cols-12` (and column spans from `xl:` to `lg:`) so the two-column layout activates at 1024px instead of 1280px

## Files to modify

| File | Change |
|------|--------|
| `ProjectHome.tsx` | Replace AttentionBanner + HealthBanner with compact inline alert bar; tighten spacing; lower grid breakpoint |
| `ProjectFinancialCommand.tsx` | Reduce gap to `gap-2` |
| `AttentionBanner.tsx` | Restyle as compact inline chip bar (or inline the logic into ProjectHome) |
| `ProjectHealthBanner.tsx` | Merge into the new compact bar (may be deleted) |

## What is NOT changing
- Sidebar, header, top bar
- Business logic, data fetching
- Mobile layout
- Card content in the 8/4 grid
