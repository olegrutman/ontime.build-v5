

# Align Numbers & Move % Before Value on Materials Budget Status Card

## Problem
The percentage labels appear after the dollar values, and numbers may not align cleanly across rows.

## Changes

**File: `src/components/project/MaterialsBudgetStatusCard.tsx`**

Update the `Row` component (lines 101–114) to:
1. Place the percentage **before** the dollar value
2. Give the value span a fixed minimum width so all dollar amounts right-align consistently

```tsx
function Row({ label, value, sub, over }: { label: string; value: string; sub?: string; over?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {sub && (
          <span className={cn("text-xs font-medium w-14 text-right", over ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
            {sub}
          </span>
        )}
        <span className="text-sm font-semibold tabular-nums text-right min-w-[90px]">{value}</span>
      </div>
    </div>
  );
}
```

Key changes:
- `sub` (percentage) rendered **before** the value
- Percentage gets a fixed width (`w-14`) for alignment
- Dollar value gets `min-w-[90px]` so amounts line up across all rows
- Budget row (no sub) will still align because the value has the same min-width

Single file, no database changes.

