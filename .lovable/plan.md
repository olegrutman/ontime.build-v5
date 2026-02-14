

# Add Account Avatar and Dropdown Menu to Mobile Top Bar

On mobile/tablet (below lg), the sidebar is hidden and there's no way to access the profile, approvals, or admin pages. This adds a user avatar button in the top-right corner of the `TopBar` with a dropdown menu containing quick links to those pages.

## What Changes

### 1. Add avatar + dropdown to `TopBar.tsx`

Add a user avatar button (visible only below lg via `lg:hidden`) in the top-right actions area of `TopBar`. Clicking it opens a dropdown menu with:

- **Profile** link (to `/profile`)
- **Separator**
- **Estimate Approvals** (GC_PM only, to `/approvals/estimates`)
- **Manage Suppliers** (GC_PM / TC_PM only, to `/admin/suppliers`)
- **Separator**
- **My Team** (org admins only, to `/org/team`)
- **Settings** (to `/profile`)
- **Separator**
- **Sign out**

The avatar shows user initials (matching sidebar style) and the dropdown uses the same `DropdownMenu` component already used in `Header.tsx`.

### 2. Import auth context in TopBar

Add `useAuth` and `useNavigate` hooks to `TopBar` to access `profile`, `currentRole`, and navigation. Also import `Avatar`, `AvatarFallback`, `DropdownMenu` components, and role permission constants.

## Files Modified

| File | Change |
|------|--------|
| `src/components/layout/TopBar.tsx` | Add avatar button with dropdown menu, visible only on mobile/tablet |

## What Is NOT Changed

- Desktop layout: sidebar still provides all navigation on lg+
- BottomNav unchanged
- No database or logic changes
- Notification bell stays in its current position

