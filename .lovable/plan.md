

# Clean Up Mobile Dropdown & Split Profile / Settings

## Problem
1. `MobileProjectHeader.tsx` avatar dropdown still has duplicate "Profile" and "Settings" items that both navigate to `/profile`
2. The current `/profile` page is a single 900-line page combining personal info, org details, pricing, security, notifications, and danger zone -- "Profile" and "Settings" should be separate pages

## Plan

### 1. Create a new `/settings` page (`src/pages/Settings.tsx`)
- Move these sections from `Profile.tsx` into the new Settings page:
  - **Security** (change password)
  - **Notifications** (all notification toggles)
  - **Danger Zone** (sign out, delete account)
- Reuse the same `useProfile` hook and `AppLayout`
- Title: "Settings" with subtitle "Security, notifications, and account management"

### 2. Trim `Profile.tsx` to profile-only content
- Keep only:
  - **Personal Information** (name, phone, contact method, timezone, job title)
  - **Organization Information** (company details, trade, license)
  - **Pricing Defaults** (hourly rate, markup, crew size)
- Update page title from "Profile & Settings" to "Profile"

### 3. Add `/settings` route in `App.tsx`
- Add lazy import for `Settings`
- Add protected route `/settings`

### 4. Fix `MobileProjectHeader.tsx` dropdown
- "Profile" item navigates to `/profile`
- "Settings" item navigates to `/settings`
- Remove duplicate separators

### 5. Update `AppSidebar.tsx` footer
- Add a Settings icon button/link next to the user avatar in the sidebar footer, navigating to `/settings`

### 6. Update `Header.tsx`
- Ensure "Settings" menu item navigates to `/settings` (it already does, just verify)

**6 files modified, 1 new file created. No database changes.**

