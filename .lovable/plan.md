

# Add Back-to-Dashboard Navigation on Mobile Project Pages

## Problem
On mobile project pages, there is no way to navigate back to the dashboard. The `ContextBar` (which has the logo linking to `/dashboard`) is part of `AppShell`, but `ProjectHome` uses its own layout (`ProjectShell` + `ProjectBottomNav`). The `ProjectBottomNav` only has project-level tabs (Overview, COs, Invoices, Orders, More) with no home/back button.

## Solution
Add a back arrow to the project header area on mobile that navigates to `/dashboard`.

## Changes

| # | File | What |
|---|------|------|
| 1 | `ProjectHome.tsx` (~line 295) | Add a back arrow (`ArrowLeft` or `ChevronLeft` icon) to the left of the project header on mobile. Tapping it navigates to `/dashboard`. Show on mobile only (`md:hidden`). |
| 2 | `ProjectBottomNav.tsx` | Add a "Home" item (`Home` icon) as the first item in the bottom nav, navigating to `/dashboard` instead of a project sub-route. This gives users a persistent way back. |

Option 2 is the cleaner UX — a Home icon in the bottom nav is always visible and discoverable. The back arrow in the header is a secondary reinforcement.

## Implementation detail
- In `ProjectBottomNav.tsx`, add `{ label: 'Home', icon: Home, route: '__home__' }` before the existing PRIMARY_ITEMS
- In `handleNavigate`, check for the `__home__` sentinel and call `navigate('/dashboard')` instead of the project sub-route
- Keep the existing 4 items + More + Capture, making Home the 6th (or replace one slot). Since space is tight, the cleanest approach is adding a small back arrow in the project header rather than adding to the already-full bottom nav.

## Recommended approach
Add a back/home button in the **project header** only (line ~295 in ProjectHome.tsx):
```text
┌──────────────────────────────┐
│ ← │ Project Overview          │  ← back arrow on mobile
│   │ Fuller Residence          │
│   │ Status Active  Health ... │
└──────────────────────────────┘
```
This keeps the bottom nav uncluttered and follows standard mobile patterns (top-left back arrow).

