

# Clean Up Scope & Labor UX — Plain English Explanation

## What's wrong today

1. **Dollar amounts show three decimals** — numbers like "$5,604.988" appear in the totals strip and progress bar because the formatting doesn't cap decimals. Should always show whole dollars or two decimals max.

2. **GC sees confusing labels** — The KPI cards show "Field Crew Cost" and "My Billable (Labor)" to the GC. The GC doesn't know or care about the TC's field crew. From the GC's perspective, they just need to know: "What is the TC charging me?" and "What's the total?"

3. **Scope & Labor totals strip says "Billable to GC" to everyone** — When the GC is looking at this, it should say "Labor Total" or "Submitted Cost", not "Billable to GC" (they ARE the GC). The label only makes sense for TC/FC.

## What we'll fix

### 1. Fix all decimal formatting (3 files)

Add `maximumFractionDigits: 2` everywhere dollars are displayed. Specifically:
- **CODetailLayout.tsx** — the totals strip and progress bar summary (lines 271, 277, 281, 293)
- **COLineItemRow.tsx** — the `fmt()` function already does 2 decimals, so it's fine
- **COKPIStrip.tsx** — already shows whole dollars, fine

### 2. Role-aware labels in KPI cards

**For GC**, change the 4 KPI tiles to:
- "TC Labor" (what the TC is charging) → instead of "Field Crew Cost"  
- "TC Submitted" (the TC's billable amount) → instead of "My Billable (Labor)"
- "Materials + Equipment" (same)
- "Total Cost" → instead of "Total to GC"

**For TC**, keep as-is but rename:
- "Field Crew Cost" → "FC Cost" (shorter, clearer)
- "My Billable (Labor)" → "My Billable" (drop the parenthetical)

**For FC**, no changes needed — already makes sense.

### 3. Role-aware labels in Scope & Labor totals strip

- **GC sees**: "Labor Total" (single column, no internal cost or margin — those are private)
- **TC sees**: "Billable to GC" | "Internal Cost" | "Gross Margin" (current, correct)
- **FC sees**: "Billed to TC" | "Internal Cost" | "Gross Margin"

### 4. GC should NOT see FC cost separately

The GC's relationship is with the TC. The FC is the TC's subcontractor — the GC shouldn't see a separate "Field Crew Cost" card. Replace it with something meaningful to the GC like the TC's submitted labor total.

## Files changed

- **`src/components/change-orders/COKPIStrip.tsx`** — role-aware tile labels (~10 lines)
- **`src/components/change-orders/CODetailLayout.tsx`** — fix decimal formatting, role-aware totals strip labels (~8 lines)

## What stays the same

- COLineItemRow — formatting already correct
- Sidebar financials — already role-aware
- All database/RLS — no changes

