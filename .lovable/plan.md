

# Add Profile Icon to All Mobile Headers

## Problem
The main `TopBar` (used on Dashboard, Financials, Partners, etc.) already shows a profile avatar with dropdown on mobile. However, two project-level headers are missing it:
1. `MobileProjectHeader` -- used on the Project Home screen (mobile only)
2. `WorkOrderTopBar` -- used on the Work Order detail screen

## Changes

### 1. `src/components/project/MobileProjectHeader.tsx`
- Import `Avatar`, `AvatarFallback`, `DropdownMenu` (and related), `useAuth`, and the same icons used in `TopBar`
- Add the same avatar + dropdown menu pattern from `TopBar` after the notification bell
- The dropdown includes: Profile, role-based admin links (Estimate Approvals, Manage Suppliers, My Team), Settings, and Sign Out

### 2. `src/components/change-order-detail/WorkOrderTopBar.tsx`
- Import `Avatar`, `AvatarFallback`, `DropdownMenu` (and related), `useAuth`, and the same icons
- Add the avatar + dropdown after the notification bell, visible only on mobile (`lg:hidden`)
- Same dropdown menu items as above

### Technical Details
Both components will replicate the existing pattern from `TopBar` (lines 67-118):
- Compute `initials` from `profile.full_name`
- Render `Avatar` with `AvatarFallback` inside a `DropdownMenuTrigger`
- Show the trigger only on mobile (`lg:hidden`)
- Dropdown includes role-based menu items using `currentRole` and `permissions` from `useAuth()`
