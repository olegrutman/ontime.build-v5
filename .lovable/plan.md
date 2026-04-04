

# Make Dashboard Content Fill the Screen

## Problem
The dashboard content area (right of sidebar) has `px-3 sm:px-6` padding (line 198 of Dashboard.tsx), creating visible gaps between the sidebar and the first card, and between cards and the right edge. Combined with the AppShell already applying `px-0` for fullWidth, the content still feels padded and not edge-to-edge.

## Fix
Increase the content area padding to `px-4 sm:px-5 lg:px-6` for a balanced full-screen feel — enough breathing room without wasted space. Also ensure the right-column (business snapshot, reminders) stretches properly by keeping the 8/4 grid but with tighter gaps.

Actually, the real problem is simpler: the `fullWidth` on AppShell sets `px-0`, but the inner dashboard div at line 198 adds back `px-3 sm:px-6`. This is correct — we want some padding. But looking at the screenshot, the content cards end well before the right edge of the viewport. The 12-col grid with 8/4 split inside a padded container leaves the right column (business snapshot at ~300px) too narrow and the left too wide.

### Changes

| File | Change |
|------|--------|
| `Dashboard.tsx` line 198 | Change `px-3 sm:px-6` to `px-4 lg:px-6` for slightly more generous padding |
| `Dashboard.tsx` line 234 | Change grid from `xl:grid-cols-12` to `xl:grid-cols-3` with left `xl:col-span-2` and right `xl:col-span-1` — gives the right column ~33% width instead of ~33% (same ratio but simpler). Or better: keep 12-col but change to 9/3 split so content fills more. |

Wait — let me reconsider. The 8/4 split (66/33%) should be fine. The issue might be that the `xl:` breakpoint (1280px) isn't hit in the preview viewport. Let me check: viewport is 2143px wide, minus Lovable UI (~600px for left panel) = ~1543px for preview. Minus sidebar (220px) = ~1323px for content. That should hit `xl:` (1280px)... but the sidebar is inside the content wrapper, so the grid container is ~1323 - 24px padding = ~1299px. That's right at the `xl` boundary.

The real fix: the content area should use the full width more aggressively. Change padding to `px-4 lg:px-5` (tighter) so the grid gets more room.

### Final approach

1. **`Dashboard.tsx` line 198**: Reduce padding to `px-4 lg:px-5` 
2. **`Dashboard.tsx` line 234**: Lower the grid breakpoint from `xl:grid-cols-12` to `lg:grid-cols-12` so the two-column layout kicks in earlier (at 1024px instead of 1280px)
3. **`Dashboard.tsx` lines 236, 270**: Change breakpoints from `xl:col-span-8`/`xl:col-span-4` to `lg:col-span-8`/`lg:col-span-4`

This ensures the dashboard content fills the viewport properly at the user's screen size.

### Files to modify
| File | Change |
|------|--------|
| `Dashboard.tsx` | Tighten padding (`px-4 lg:px-5`), lower grid breakpoint from `xl` to `lg` |

