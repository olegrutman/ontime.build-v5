
# Plan: Add Scrolling to QuantityPanel

## Problem

The `QuantityPanel` component lacks a scroll wrapper. When content exceeds the viewport (especially on mobile or when showing engineered lumber options with multiple steppers, notes, and buttons), users cannot scroll to see all content.

## Current State

| Component | Scroll Container | Status |
|-----------|------------------|--------|
| CategoryGrid | `h-full overflow-y-auto` | ✅ Fixed |
| SecondaryCategoryList | `h-full overflow-y-auto` | ✅ Fixed |
| StepByStepFilter | `flex-1 overflow-y-auto` | ✅ Working |
| ProductList | `flex-1 overflow-y-auto` | ✅ Working |
| **QuantityPanel** | None - just `p-4 space-y-4` | ❌ Needs fix |

## Solution

Wrap `QuantityPanel` content in a scrollable container with `h-full overflow-y-auto`, keeping the content inside properly structured.

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/po-wizard-v2/QuantityPanel.tsx` | Add scroll wrapper around content |

---

## Technical Change

### `src/components/po-wizard-v2/QuantityPanel.tsx`

**Current structure (line 130-327):**
```typescript
return (
  <div className="p-4 space-y-4">
    {/* Product Summary Card */}
    {/* Steppers / Mode Selection */}
    {/* Notes Input */}
    {/* Submit Button */}
  </div>
);
```

**Updated structure:**
```typescript
return (
  <div className="h-full overflow-y-auto">
    <div className="p-4 space-y-4">
      {/* Product Summary Card */}
      {/* Steppers / Mode Selection */}
      {/* Notes Input */}
      {/* Submit Button */}
    </div>
  </div>
);
```

---

## Summary

Add `h-full overflow-y-auto` wrapper to `QuantityPanel` to ensure all content (product summary, quantity steppers, notes, and submit button) is accessible via scrolling on smaller screens or when engineered lumber mode displays additional fields.
