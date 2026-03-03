

# Fix TopBar Mobile Dropdown

## Problem
The `TopBar.tsx` component (used on non-project pages like Profile, Dashboard, etc.) was missed during cleanup. Its mobile avatar dropdown still contains:
1. **"Estimate Approvals"** — removed page, dead link
2. **"Manage Suppliers"** — removed page, dead link  
3. **"Settings"** navigates to `/profile` instead of `/settings`

## Changes

### `src/components/layout/TopBar.tsx`
- Remove the "Estimate Approvals" menu item (lines 85-90)
- Remove the "Manage Suppliers" menu item (lines 91-96)
- Remove now-unused imports (`Shield`, `Package`)
- Change Settings `navigate('/profile')` → `navigate('/settings')` on line 108

**1 file modified.**

