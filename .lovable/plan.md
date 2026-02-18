

# Show RFI Page for Supplier Users

## Problem
The sidebar navigation in `AppSidebar.tsx` explicitly hides the "RFIs" link for supplier users (line 124). Even though we enabled `canCreateRFIs: true` for suppliers, they cannot navigate to the page.

## Fix

**File: `src/components/layout/AppSidebar.tsx`** (1 line)

Remove the filter that hides the RFIs nav item for suppliers. Change:

```
if (item.url === '/rfis' && isSupplier) return false;
```

to simply not filter out `/rfis` for suppliers. The `/financials` filter can remain since suppliers don't need that page.

Also check the mobile bottom nav (`BottomNav.tsx`) to ensure RFIs are accessible on mobile for suppliers as well.

## Technical Details

- Line 124 in `AppSidebar.tsx`: Remove the `isSupplier` check for `/rfis`
- Verify `BottomNav.tsx` doesn't have a similar filter blocking supplier access on mobile
