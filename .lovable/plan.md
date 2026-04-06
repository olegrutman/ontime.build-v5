

# Fix Ontime Logo Visibility

## Problem

The logo was hidden from the top header bar (`lg:hidden`) when the sidebar was added, and while it exists in the sidebar, it may not be clearly visible due to the dark logo background blending with the dark sidebar.

## Fix

1. **ContextBar** — Remove the `lg:hidden` from the logo button so it shows in the header on all screen sizes. The sidebar logo serves as navigation; the header logo provides brand presence.

2. **OR** — Keep the current approach (logo only in sidebar) but ensure the sidebar logo is clearly visible by adding contrast. The `OntimeLogo` SVG has a `#323C47` dark background that blends into the dark sidebar.

**Recommended approach**: Restore the logo in the header bar on desktop. It's a small element that provides important brand identity, and users expect it there.

## Changes

| File | Change |
|------|--------|
| `src/components/app-shell/ContextBar.tsx` | Remove `lg:hidden` from the logo button (line 41) so logo shows on all breakpoints |

