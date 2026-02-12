

# Redesign Invoice Status Tiles to Match Dashboard Style

Layout/styling only. No logic, permissions, database, or route changes.

## What Changes

The `renderSummaryCards()` function in `src/components/invoices/InvoicesTab.tsx` (lines 340-358) currently renders plain colored `div` boxes with centered text. These will be upgraded to match the dashboard `StatsCards` pattern.

### Current (plain divs, centered text, colored backgrounds)
```
[ 2 Draft ] [ 1 Pending ] [ 3 Approved ] [ 0 Paid ]
```

### New (Card components with icons, left-aligned, icon badge in corner)
Each tile becomes a `Card` with:
- **Top-left**: Uppercase tracking-wide label (e.g., "DRAFT", "PENDING APPROVAL")
- **Below label**: Large bold count number
- **Top-right**: Colored icon badge in a rounded container (matching the status color)
- Icons: `FileEdit` for Draft, `Clock` for Pending, `CheckCircle2` for Approved, `Wallet` for Paid
- A 5th summary tile for "Total Billed" showing the currency amount

### Grid
- `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` (same responsive pattern as dashboard StatsCards)

## File Modified

| File | Change |
|------|--------|
| `src/components/invoices/InvoicesTab.tsx` | Replace `renderSummaryCards()` body with Card-based tiles matching dashboard StatsCards style |

## What Is NOT Changed
- No logic, permissions, or database changes
- No new components or files
- All other invoice functionality unchanged
