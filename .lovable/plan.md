

# Fix KPI Card Internal Text Alignment

## Problem
Inside each KPI card, the text elements (label, value, subtitle) don't line up across cards in the same row. Short labels like "PENDING FROM GC_TEST" vs long ones like "PENDING · YOU OWE FC_TEST" cause the dollar value and subtitle to sit at different vertical positions even though `minHeight` zones exist.

## Root Cause (in `src/components/shared/KpiCard.tsx`)
- **Label zone** (line 104): uses `alignItems: 'flex-end'` which pushes short labels to the bottom of the 28px zone — this is wrong. Labels should anchor to the **top** so the value always starts at the same Y position.
- **Value zone** (line 108): has no fixed height, so if a value wraps or differs in character count, everything below shifts.
- **Sub zone** (line 110): correctly has `minHeight: 24` but the label misalignment above cascades down.

## Fix — 1 file, 3 lines

**File: `src/components/shared/KpiCard.tsx`**

1. **Label zone (line 104)**: Change `alignItems: 'flex-end'` → `alignItems: 'flex-start'` — labels anchor to top of their zone, so the value below always starts at the same position regardless of label length.

2. **Value zone (line 108)**: Add `minHeight: 36` and `display: 'flex', alignItems: 'center'` — ensures the dollar amount row has a consistent fixed height.

3. **Sub zone (line 110)**: Already correct — no change needed.

This ensures across any row of 4 cards:
- All labels start at the same top position
- All dollar values sit at the same vertical line
- All subtitles align
- All "Expand for detail" bars align at the bottom

No other files need changes — all 8 consumer files import from this shared component.

