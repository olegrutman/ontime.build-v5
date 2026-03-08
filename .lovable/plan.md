

# Align Profit Position Card Numbers & Move Edit Button

## Problem
In the GC Profit Position card, the "Owner Contract" row has the edit pencil icon after the value on the right side, which pushes the number out of alignment with "Current Contract Total" below it. Numbers should be right-aligned consistently.

## Changes

### File: `src/components/project/ProfitCard.tsx`

**GC section (lines 72–82):** Move the pencil edit button to the left side, in front of the "Owner Contract" label, so the currency value on the right aligns perfectly with "Current Contract Total" below it.

Before:
```
Owner Contract                    $500,000 ✏️
Current Contract Total              $450,000
```

After:
```
✏️ Owner Contract                  $500,000
Current Contract Total              $450,000
```

The edit icon will appear on hover before the label text, keeping all right-side values in a clean column. The value `span` stays as-is with `tabular-nums` for consistent digit widths.

