

# Hide TC-Level Scope & Labor Summary Numbers from FC

## Problem
The totals strip inside the "SCOPE & LABOR" card header shows three numbers: "Billed to TC", "Internal Cost", and "Gross Margin". These aggregate ALL labor entries (TC + FC combined) — they represent the TC's financial picture, not the FC's. The FC should not see these.

The FC already has their own correct numbers in the sidebar ("My Labor", "FC Profitability") and the KPI strip at the top. The scope card summary is redundant and misleading for them.

## Change

**`src/components/change-orders/CODetailLayout.tsx`**

1. **Line 272-293 (Totals strip)**: Hide the entire 3-column totals strip from FC by changing the render condition or wrapping with `!isFC`. The FC doesn't need "Billed to TC / Internal Cost / Gross Margin" — their own financials are in the sidebar and KPI tiles.

2. **Line 307 (Progress bar "logged" amount)**: Also hide the `$X,XXX logged` text from the progress bar for FC, since `totalLogged` includes TC entries too.

Specifically:
- Wrap the totals strip (lines 272-293) with `!isFC` so only TC and GC see it
- Change `!isGC` on line 307 to `isTC` so only TC sees the logged total in the progress bar

One file, two small conditional changes.

