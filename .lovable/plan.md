

# Plan: Show Previous Amount Billed on SOV Items Before Enabling

## Problem Summary
Currently, the previous billing amount for SOV items is only displayed **after** the user toggles the item on (enables it). Users need to see this information **upfront** to make informed decisions about which items to bill.

## Current Behavior
- Previous billing info (lines 613-619) is inside `{item.enabled && (...)}` block
- Users must toggle an item ON to see how much was previously billed
- This requires trial-and-error to find items with remaining balance

## Solution
Move the previous billing summary **outside** the `enabled` condition so it's always visible on each SOV item card, regardless of whether the item is toggled on.

---

## Implementation Details

### File: `src/components/invoices/CreateInvoiceFromSOV.tsx`

**Current Structure (lines 590-697):**
```
├── Item details container (flex-1)
│   ├── Item name + Scheduled Value (always visible)
│   └── {item.enabled && (...)}  ← Previous billing hidden here
│       ├── Fully billed indicator OR
│       ├── Progress bar with previous/new billing
│       ├── Slider + Input
│       └── Max available hint
```

**New Structure:**
```
├── Item details container (flex-1)
│   ├── Item name + Scheduled Value (always visible)
│   ├── Previous billing summary (ALWAYS visible) ← NEW
│   └── {item.enabled && (...)}
│       ├── Fully billed indicator OR
│       ├── Progress bar (without redundant text)
│       ├── Slider + Input
│       └── Max available hint
```

---

## Specific Changes

### Add new section between item header and enabled block (after line 597)

Add a compact summary row showing:
- Previous billed amount and percentage
- Remaining balance (value - previous billed)

```tsx
{/* Previous billing summary - always visible */}
<div className="flex items-center justify-between text-sm">
  <div className="flex items-center gap-2 text-muted-foreground">
    {previousBilledAmount > 0 ? (
      <>
        <span>Previously billed: {formatCurrency(previousBilledAmount)} ({previousPercent.toFixed(1)}%)</span>
      </>
    ) : (
      <span>Not yet billed</span>
    )}
  </div>
  <span className={cn(
    "font-medium",
    item.maxAllowedPercent === 0 
      ? "text-green-600 dark:text-green-400" 
      : "text-muted-foreground"
  )}>
    {item.maxAllowedPercent === 0 
      ? "Fully billed" 
      : `${formatCurrency(item.value_amount - previousBilledAmount)} remaining`
    }
  </span>
</div>
```

### Keep progress bar legend when enabled (lines 611-629)

The detailed legend with colored squares will remain visible when the item is enabled, as it shows the "This bill" breakdown.

---

## Visual Mockup

**Before (item disabled):**
```
┌─────────────────────────────────────────────────────────────┐
│ ○  Framing - Main Structure                        $50,000  │
└─────────────────────────────────────────────────────────────┘
```

**After (item disabled):**
```
┌─────────────────────────────────────────────────────────────┐
│ ○  Framing - Main Structure                        $50,000  │
│    Previously billed: $25,000 (50%)        $25,000 remaining│
└─────────────────────────────────────────────────────────────┘
```

**After (item enabled with new billing):**
```
┌─────────────────────────────────────────────────────────────┐
│ ●  Framing - Main Structure                        $50,000  │
│    Previously billed: $25,000 (50%)        $25,000 remaining│
│    ┌──────────────────────────────────────────────────────┐ │
│    │ ■ Previous: 50%    ■ This bill: 25% ($12,500)  75%  │ │
│    │ [▓▓▓▓▓▓▓▓▓▓████████░░░░░░░░░░░░░░░░░░░░░░░░░░░] │    │ │
│    │ ○────────────●──────────────────────○ [25%]         │ │
│    │ Max available: 50.0%                                │ │
│    └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/invoices/CreateInvoiceFromSOV.tsx` | Add "Previously billed" and "Remaining" row visible for all items |

---

## Testing Checklist

1. Open invoice creation dialog
2. Verify each SOV item shows previous billed amount (or "Not yet billed")
3. Verify remaining balance is displayed
4. Verify items at 100% show "Fully billed"
5. Toggle items on and verify the detailed progress bar still works
6. Create an invoice and confirm calculations are correct

