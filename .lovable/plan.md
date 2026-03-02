

# Redesign PO Cards for Clarity

## Current Problems

1. **PO number is too prominent** -- the large icon + bold PO number + date takes up a lot of header space
2. **Supplier row with icon + label + value is verbose** -- "Supplier" label is obvious from context
3. **"Items" section with icon + label + value is redundant** -- can be condensed
4. **Estimate pack comparison is hard to scan** -- "Pack: $40,528.00 (16 items) -> Ordered: $41,020.28 (16 items) (+$492.28)" is a wall of text
5. **"$ Total" label with DollarSign icon is redundant** -- we already see it's a dollar amount
6. **Too many border-t dividers** create visual noise
7. **Package icon in header is unnecessary** -- the card is already on the PO tab

## Proposed Redesign

### New Layout (compact, scannable)

```text
+--------------------------------------------------+
| PO-GCTEST-260302-0059        [Submitted] [Invoiced] |
| Test Building Supply Co.  ·  16 items  ·  Mar 1   |
|                                                    |
| From Estimate · Pack: 5th Floor Framing...         |
| Est $40,528 (16) -> $41,020 (16)  +$492           |
|                                                    |
|                              Total   $43,124.62    |
|                                                    |
| [Edit]  [Submit to Supplier]                       |
+--------------------------------------------------+
```

### Specific Changes

**Header row (line 1):**
- Remove the 40x40 Package icon box -- saves horizontal space
- PO number as `text-sm font-semibold` (smaller than current `font-medium` on an h4)
- Status badge stays on the right, same line

**Subtitle row (line 2):**
- Combine supplier name, item count, and date into a single muted line separated by dots
- e.g. "Test Building Supply Co. · 16 items · Mar 1, 2026"
- Removes two icon+label blocks and the 2-column grid

**Estimate section (if from estimate):**
- Keep the "From Estimate" badge but make it smaller (inline pill)
- Simplify the comparison to a single concise line:
  - "Est $40,528 -> Ordered $41,020 (+$492)" with color on the delta
- Remove the arrow icon and item counts (they can see items in subtitle)

**Total:**
- Right-aligned, no DollarSign icon, just "Total" label + bold amount
- Remove the border-t divider above total -- use spacing instead

**Delivery tracking:**
- Keep but condense into subtitle-style text if present

**Action buttons:**
- Keep at bottom, no change needed

## Files Changed

| File | Change |
|------|--------|
| `src/components/purchase-orders/POCard.tsx` | Restructure layout: remove Package icon, combine supplier/items/date into subtitle, simplify estimate comparison, clean up dividers |

