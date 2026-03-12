

# PO Wizard: Manual Quantity Input + Auto-Bundle

## What I Understood

Two changes to `QuantityPanel.tsx`:

1. **Tappable quantity number becomes an editable input** -- Instead of the big `<span>` showing the number (which only changes via +/-), make it a number input so users can type "48" directly instead of tapping + 48 times.

2. **Bundle button auto-fills bundle quantity** -- When the user taps the "Bundle" order mode button, the quantity should immediately jump to the bundle amount (e.g., 16 for a bundle of 16). This already works for new items but needs to also work reliably when switching modes during editing.

This applies to all three quantity steppers in the panel: pieces (engineered), length (engineered), and standard quantity.

## Changes

**File: `src/components/po-wizard-v2/QuantityPanel.tsx`**

Replace the `<span>` displays (lines 182, 207, 271, 316) with a styled `<Input type="number">` that:
- Shows the current value centered, large font
- On change, parses to integer and clamps to min 1 (max 60 for length)
- On blur, if empty or invalid, resets to 1
- Keeps the same visual weight (text-3xl, w-20, text-center)

Also applies to `UnmatchedItemEditor.tsx` (line 78) for consistency.

The bundle auto-fill already works via the `useEffect` on line 57-65 -- no logic change needed there, just confirming it stays intact.

**No new files. No data changes. Single file edit.**

