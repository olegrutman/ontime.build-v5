

# Move Edit Icon Next to Number & Always Visible

**File: `src/components/project/ProfitCard.tsx` (lines 72–82)**

Move the pencil icon from before the label to before the value on the right side, and remove the hover-only visibility (`opacity-0 group-hover:opacity-100`) so it's always visible.

```
Before:  ✏️ Owner Contract          $500,000
After:   Owner Contract          ✏️ $500,000
```

The edit button moves into the right-side value area, always visible, keeping the number aligned via `tabular-nums`.

