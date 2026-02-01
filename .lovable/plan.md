
# Plan: Prevent SOV Items from Exceeding 100% Billing

## Problem Summary
Currently, when creating an invoice, users can set billing percentages that exceed 100% total for SOV items. The UI shows a warning but doesn't prevent the action. This allows overbilling.

## Current Behavior
- Slider allows 0-100% for "this bill" percentage regardless of previous billing
- Input field allows 0-100% regardless of previous billing  
- `maxAllowedPercent` is calculated correctly as `100 - previous_billing_percent`
- An error message is shown when exceeding, but the value is still accepted
- The "Create Invoice" button is disabled when `hasErrors` is true

## Solution

Enforce the `maxAllowedPercent` limit at the input level so users cannot even select values that would exceed 100% total.

### Changes Required

**File: `src/components/invoices/CreateInvoiceFromSOV.tsx`**

| Location | Current | Change |
|----------|---------|--------|
| Line 322 (handlePercentChange) | Clamps to 0-100 | Clamp to 0-`maxAllowedPercent` for the specific item |
| Line 679 (Slider max) | `max={100}` | `max={item.maxAllowedPercent}` |
| Line 689-690 (Input max) | `max="100"` | `max={item.maxAllowedPercent}` |

---

## Implementation Details

### 1. Update `handlePercentChange` Function (Lines 318-330)

**Before:**
```typescript
const handlePercentChange = (itemId: string, percent: number) => {
  setBillingItems(prev => prev.map(item => {
    if (item.id !== itemId) return item;
    
    const clampedPercent = Math.min(Math.max(0, percent), 100);
    const billAmount = Math.round((item.value_amount * clampedPercent / 100) * 100) / 100;
    
    return {
      ...item,
      thisBillPercent: clampedPercent,
      thisBillAmount: billAmount,
    };
  }));
};
```

**After:**
```typescript
const handlePercentChange = (itemId: string, percent: number) => {
  setBillingItems(prev => prev.map(item => {
    if (item.id !== itemId) return item;
    
    // Clamp to maxAllowedPercent to prevent exceeding 100% total billing
    const clampedPercent = Math.min(Math.max(0, percent), item.maxAllowedPercent);
    const billAmount = Math.round((item.value_amount * clampedPercent / 100) * 100) / 100;
    
    return {
      ...item,
      thisBillPercent: clampedPercent,
      thisBillAmount: billAmount,
    };
  }));
};
```

### 2. Update Slider Component (Line 676-683)

**Before:**
```tsx
<Slider
  value={[item.thisBillPercent]}
  onValueChange={([value]) => handlePercentChange(item.id, value)}
  max={100}
  step={1}
  disabled={!item.enabled}
  className={cn(isOverBilling && "[&_[role=slider]]:bg-destructive")}
/>
```

**After:**
```tsx
<Slider
  value={[item.thisBillPercent]}
  onValueChange={([value]) => handlePercentChange(item.id, value)}
  max={item.maxAllowedPercent}
  step={1}
  disabled={!item.enabled || item.maxAllowedPercent === 0}
/>
```

### 3. Update Input Field (Lines 686-700)

**Before:**
```tsx
<Input
  type="number"
  min="0"
  max="100"
  step="0.5"
  value={item.thisBillPercent}
  onChange={(e) => handlePercentChange(item.id, parseFloat(e.target.value) || 0)}
  disabled={!item.enabled}
  className={cn(
    "h-8 w-16 text-right",
    isOverBilling && "border-destructive"
  )}
/>
```

**After:**
```tsx
<Input
  type="number"
  min="0"
  max={item.maxAllowedPercent}
  step="0.5"
  value={item.thisBillPercent}
  onChange={(e) => handlePercentChange(item.id, parseFloat(e.target.value) || 0)}
  disabled={!item.enabled || item.maxAllowedPercent === 0}
  className="h-8 w-16 text-right"
/>
```

### 4. Add "Fully Billed" Indicator

When an item is already at 100%, show a clear indicator:

```tsx
{item.maxAllowedPercent === 0 ? (
  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
    <CheckCircle className="h-4 w-4" />
    <span>Fully billed (100%)</span>
  </div>
) : (
  // ... existing slider/input UI
)}
```

### 5. Remove Overbilling Error Message

Since overbilling is now impossible, the error message (lines 704-708) can be replaced with a helpful hint showing the maximum available:

```tsx
<div className="text-xs text-muted-foreground">
  Max available: {item.maxAllowedPercent.toFixed(1)}%
</div>
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/invoices/CreateInvoiceFromSOV.tsx` | Clamp slider max to `maxAllowedPercent` |
| `src/components/invoices/CreateInvoiceFromSOV.tsx` | Clamp input max to `maxAllowedPercent` |
| `src/components/invoices/CreateInvoiceFromSOV.tsx` | Clamp `handlePercentChange` to `maxAllowedPercent` |
| `src/components/invoices/CreateInvoiceFromSOV.tsx` | Add "Fully billed" indicator for 100% items |
| `src/components/invoices/CreateInvoiceFromSOV.tsx` | Remove destructive styling (no longer needed) |

---

## Testing Checklist

After implementation:

1. Create an invoice for an SOV item with 50% already billed
2. Verify the slider only allows up to 50% (the remaining)
3. Verify the input field won't accept values above 50%
4. Verify items at 100% show "Fully billed" and cannot be selected
5. Create an invoice and verify totals never exceed 100%
