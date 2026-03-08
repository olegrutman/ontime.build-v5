
# Profile Update → Sidebar Display Bug Report & Fix Plan

## Bugs Found

### Bug 1: `Profile` type missing `job_title`
**Where:** `src/types/organization.ts` line 24-34
**Problem:** The `Profile` interface used by `useAuth` doesn't include `job_title`. The database column exists and the profile page writes to it, but `useAuth` never exposes it. The sidebar therefore cannot display the user's job title.

### Bug 2: Sidebar shows system role, not job title
**Where:** `src/components/layout/AppSidebar.tsx` lines 229-232
**Problem:** The sidebar footer always shows `ROLE_LABELS[currentRole]` (e.g., "General Contractor Manager") or "Owner". Per the existing memory note, job title should take priority over the system role label. The sidebar never checks `profile.job_title`.

### Bug 3: Profile update doesn't refresh auth context
**Where:** `src/pages/Profile.tsx` line 131-142
**Problem:** After `handleSavePersonal` calls `updateProfile`, it only updates the local `useProfile` state. It never calls `refreshUserData()` from `useAuth`. This means the sidebar (which reads from `useAuth().profile`) shows stale data until the user refreshes the page.

## Fix Plan

### 1. Add `job_title` to the `Profile` interface
In `src/types/organization.ts`, add `job_title?: string | null` to the `Profile` interface.

### 2. Update sidebar to prefer job title
In `src/components/layout/AppSidebar.tsx` line 231, change:
```
{isAdmin ? 'Owner' : ROLE_LABELS[currentRole]}
```
to:
```
{isAdmin ? 'Owner' : (profile?.job_title || ROLE_LABELS[currentRole])}
```
This matches the existing pattern in `MemberDetailDialog` where job title takes priority.

### 3. Call `refreshUserData` after profile save
In `src/pages/Profile.tsx`, import `refreshUserData` from `useAuth` and call it after `updateProfile` succeeds, so the sidebar immediately reflects the new name/title.

### Files Changed
- `src/types/organization.ts` — add `job_title` to Profile interface
- `src/components/layout/AppSidebar.tsx` — show job title in footer
- `src/pages/Profile.tsx` — call `refreshUserData()` after save
