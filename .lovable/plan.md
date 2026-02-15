

# Fix Sidebar Visibility - Dark Text on Dark Background

## Problem
The sidebar has a dark background (`222 47% 11%` - near black) but the `--sidebar-foreground` is set to the exact same dark color, making all text and icons invisible.

## Fix

### File: `src/index.css` (line 75)

Change `--sidebar-foreground` from the dark color to a light color so text is readable against the dark sidebar background.

**Before:**
```css
--sidebar-foreground: 222 47% 11%;   /* dark text on dark bg = invisible */
```

**After:**
```css
--sidebar-foreground: 210 40% 98%;   /* light text on dark bg = readable */
```

This single line fix will make all sidebar navigation items, labels, group headers, and the user profile section visible against the dark sidebar background. The value `210 40% 98%` is a near-white that matches what the dark mode sidebar already uses and provides strong contrast.

