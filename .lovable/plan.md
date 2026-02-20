

# Make "Change Pack" Button More Prominent

## Problem
The "Change Pack" button on the Items screen is styled as a tiny ghost button (`variant="ghost" size="sm" className="h-7 text-xs"`) inside a subtle muted banner. It blends in and is easy to miss.

## Solution
Restyle the pack source banner and button to be more visually prominent:

### File: `src/components/po-wizard-v2/ItemsScreen.tsx`
- Change the banner background from `bg-muted/60` to `bg-primary/10 border border-primary/20` for better visual contrast
- Change the "Change Pack" button from `variant="ghost"` to `variant="outline"` with a slightly larger size and bolder text
- Add a Package icon to the banner for visual clarity

**Before:**
```
muted gray banner, tiny ghost button, easy to overlook
```

**After:**
```
Lightly tinted banner with border, outline button with readable size, Package icon prefix
```

## Technical Details

In `ItemsScreen.tsx`, update the pack source banner (around lines 73-80):
- Banner: `rounded-lg bg-primary/10 border border-primary/20 px-3 py-2.5`
- Button: `variant="outline" size="sm" className="h-8 text-sm font-medium"`

