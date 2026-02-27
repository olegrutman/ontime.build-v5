

# Fix TC Tile to Clearly Show Hours and Hourly Rate

## Problem
The TC Contract tile combines the description and hours/rate into a single line of muted text, making it hard to read. The hours and hourly rate need to be more prominent and clearly separated.

## Changes (single file: `ContractedPricingCard.tsx`)

### Restructure each TC labor entry layout
Change from the current single-line format:
```
Labor — 100hrs @ $55.00/hr          $5,500.00
```

To a two-line format per entry with clearer visual hierarchy:
```
Labor                                $5,500.00
100 hrs @ $55.00/hr
```

- **Line 1**: Description (or "Labor") on the left, total on the right -- normal weight
- **Line 2**: Hours and hourly rate detail below in smaller muted text (or "Lump Sum" for lump sum entries)

This makes the hours and rate immediately visible rather than buried in a single cramped line.

### Technical Detail
Update the `tcLabor.map()` block inside `GCPricingView` (around lines 108-118) to render each entry as a stacked layout instead of a single flex row.

