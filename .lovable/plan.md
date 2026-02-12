

# Responsive Sidebar Collapse -- UI Only

All changes are layout/styling. No logic, permissions, database, or route changes.

## Core Change: Sidebar defaults to collapsed (icons-only) on md/lg screens

The sidebar currently defaults to expanded on all non-mobile screens. This wastes horizontal space on iPads and small laptops.

### How it works today
- `SidebarProvider` has `defaultOpen = true`
- `useIsMobile()` returns `true` below 768px (shows drawer)
- Above 768px, sidebar is always expanded by default

### What changes

**1. `src/components/layout/AppLayout.tsx`** -- Pass `defaultOpen={false}` when viewport is between 768px and 1279px

Add a small hook that checks if the screen is in the "medium" range (md/lg) and passes `defaultOpen={false}` to `SidebarProvider`. On xl+ it remains expanded by default. On mobile it uses the drawer (unchanged).

Implementation: use `window.innerWidth` check on mount to set initial state:
- `< 768px`: mobile drawer (existing behavior, `defaultOpen` irrelevant)
- `768px - 1279px`: `defaultOpen={false}` (icons-only rail)
- `>= 1280px`: `defaultOpen={true}` (full sidebar)

**2. `src/pages/ProjectHome.tsx`** -- Same `defaultOpen` logic for all 3 `SidebarProvider` instances (loading, not-found, main)

**3. `src/components/change-order-detail/ChangeOrderDetailPage.tsx`** -- Same for all 3 instances

**4. `src/pages/SupplierInventory.tsx`** -- Same for both instances

**5. `src/pages/SupplierProjectEstimates.tsx`** -- Same for both instances

### Shared helper

Create a small utility hook `useDefaultSidebarOpen()` in `src/hooks/use-sidebar-default.ts`:

```typescript
export function useDefaultSidebarOpen(): boolean {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= 1280;
}
```

This is called once per component mount to set the initial sidebar state. The sidebar remains toggleable by the user at any time.

### No other changes

- Sidebar already has full collapsed/icon-only support with tooltips (built into shadcn sidebar)
- AppSidebar already handles `collapsed` state for showing/hiding labels
- TopBar and ProjectTopBar already handle responsive tabs and actions
- All previous responsive fixes (grid breakpoints, overflow, etc.) remain intact

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/use-sidebar-default.ts` | New file -- 5-line helper hook |
| `src/components/layout/AppLayout.tsx` | Import hook, pass `defaultOpen` |
| `src/pages/ProjectHome.tsx` | Same pattern for 3 SidebarProvider instances |
| `src/components/change-order-detail/ChangeOrderDetailPage.tsx` | Same for 3 instances |
| `src/pages/SupplierInventory.tsx` | Same for 2 instances |
| `src/pages/SupplierProjectEstimates.tsx` | Same for 2 instances |

## What Is NOT Changed
- No component deletions or renames
- No logic, permissions, or database changes
- No route changes
- No new UI components beyond the 5-line hook
- Sidebar remains fully toggleable by the user
- All existing responsive fixes from prior rounds are preserved

