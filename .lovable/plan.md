
# Optimize Project Overview for iPad

## Current Issues (820x1180 iPad viewport)
- The two-zone grid uses `lg:grid-cols-[1fr_360px]` (1024px breakpoint), so on iPad (820px minus sidebar) it falls to single column, stacking Zone B below Zone A
- The third MetricStrip card ("Purchase Orders") gets clipped on the right edge
- Wasted vertical space since the sidebar panel content (Team, Contracts, Scope) is short but forced below everything

## Changes

### 1. `src/pages/ProjectHome.tsx` - Enable two-zone layout at `md` breakpoint with narrower sidebar
- Change `lg:grid-cols-[1fr_360px]` to `md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_340px]`
- This activates the side-by-side layout at 768px+ (iPad), with a narrower right column (280px) that widens on desktop (340px)

### 2. `src/components/project/MetricStrip.tsx` - Prevent clipping on mid-size screens
- Reduce minimum card height and padding slightly for tighter fit
- Change `sm:grid-cols-3` to ensure cards fit within the available width on iPad by reducing gap and padding at the `md` breakpoint

### 3. `src/components/project/ProjectFinancialsSectionNew.tsx` - Tighten financial cards grid for iPad
- If the financial cards use a two-column grid, adjust the breakpoint so they display properly at `md` width with the narrower Zone A

### Technical Details
- iPad portrait: 820px viewport, sidebar collapsed ~48px = ~772px content area
- With `md` breakpoint two-zone layout: Zone A ~492px, Zone B ~280px (fits well)
- iPad landscape: 1180px, even more room
- No functional changes, purely layout/spacing adjustments
- All changes use existing Tailwind responsive utilities

### Files Modified
- `src/pages/ProjectHome.tsx` -- adjust grid breakpoint from `lg` to `md` with narrower sidebar column
- `src/components/project/MetricStrip.tsx` -- tighten card spacing for mid-size screens
- `src/components/project/ProjectFinancialsSectionNew.tsx` -- adjust financial cards grid breakpoint if needed
