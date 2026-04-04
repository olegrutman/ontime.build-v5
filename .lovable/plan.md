

# Make Dashboard Full-Screen Width

## Problem
The `AppShell` wraps all page content in a `max-w-7xl mx-auto` container (line 73), which caps the dashboard at ~1280px. Combined with the sidebar, the content area feels cramped and doesn't use the full viewport.

## Fix
Add a `fullWidth` prop to `AppShell` and `AppLayout`. When true, remove the `max-w-7xl` cap and let the content stretch edge-to-edge.

### Files to modify

| File | Change |
|------|--------|
| `AppShell.tsx` | Add `fullWidth?: boolean` prop; when true, drop `max-w-7xl mx-auto` from the content wrapper |
| `AppLayout.tsx` | Pass `fullWidth` prop through to `AppShell` |
| `Dashboard.tsx` | Set `fullWidth` on `AppLayout` |

### Detail
**AppShell.tsx line 73** changes from:
```tsx
<div className="max-w-7xl mx-auto w-full px-3 sm:px-5 md:px-6 py-4 sm:py-6 pb-24 lg:pb-6">
```
to:
```tsx
<div className={cn("w-full py-4 sm:py-6 pb-24 lg:pb-6", fullWidth ? "px-0" : "max-w-7xl mx-auto px-3 sm:px-5 md:px-6")}>
```

**Dashboard.tsx** just adds `fullWidth`:
```tsx
<AppLayout title="Dashboard" fullWidth ...>
```

This keeps all other pages (settings, partners, etc.) at the current capped width while the dashboard stretches to fill the screen.

