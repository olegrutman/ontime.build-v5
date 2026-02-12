

# Project Overview Responsive Improvements

Layout-only changes. No logic, permissions, database, or route changes.

## Change 1: Tab Labels in ProjectTopBar.tsx

**Current**: Tabs show full text at all sizes: "Work Orders", "Purchase Orders", "Documents" (disabled placeholder).

**What changes**:
- "Work Orders" tab: Show "WOs" on screens below lg, "Work Orders" on lg+
- "Purchase Orders" tab: Show "POs" on screens below lg, "Purchase Orders" on lg+
- Remove the disabled "Documents" tab entirely (it's a non-functional placeholder)

Implementation: Each tab trigger gets two spans -- one with the short label (`lg:hidden`) and one with the full label (`hidden lg:inline`).

## Change 2: Overview Layout in ProjectHome.tsx

**Current**: Two-zone grid starts side-by-side at md (`md:grid-cols-[1fr_280px]`). On iPad, the right column (Team, Contracts, Scope) is squeezed into 280px.

**What changes**:
- Change the grid to only go side-by-side at lg: `lg:grid-cols-[1fr_340px]`
- On xs/sm/md (phones and iPads): Zone B (Team, Contracts, Scope) stacks below Zone A (Attention Banner, Metrics, Financials)
- Remove the `activeTab === 'documents'` content block (tab no longer exists)

## Files Modified

| File | Change |
|------|--------|
| `src/components/project/ProjectTopBar.tsx` | Responsive short labels for WOs/POs tabs; remove Documents tab |
| `src/pages/ProjectHome.tsx` | Grid breakpoint `md:` to `lg:` for two-zone layout; remove documents content block |

## What Is NOT Changed
- No component deletions (Team, Contracts, Scope sections remain -- just repositioned)
- No logic, permissions, or database changes
- No route changes
- Sidebar, header, and all other tabs unchanged
