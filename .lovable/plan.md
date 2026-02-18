

# Fix RFI Tile Placement in Operational Summary

## Problem
The "Open RFIs" tile is currently nested inside the "Recent Invoices" div block (between lines 215 and 239 of `OperationalSummary.tsx`). This causes it to render within the invoice card rather than as its own separate section.

## Fix

**File: `src/components/project/OperationalSummary.tsx`**

Move the RFI block (lines 217-238) out of the Invoices div and place it as a standalone tile after the Invoices div closes. The restructured order will be:

1. Recent Work Orders tile
2. Recent Invoices tile (properly closed)
3. Open RFIs tile (standalone, full-width `sm:col-span-2`)
4. Team tile
5. Scope tile

### Technical Detail

- Close the Invoices `<div>` before the RFI block (add missing closing tag after invoice content)
- Move the RFI block to sit between the Invoices tile and the Team tile as a sibling in the grid
- No logic changes needed -- just fixing the JSX nesting

