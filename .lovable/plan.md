

# Route Platform Admins to /platform After Login

## Problem
When `owner@ontime.build` logs in, they are always sent to `/dashboard` (the GC view) even though they are a `PLATFORM_OWNER` in the `platform_users` table. The post-login redirect in `Auth.tsx` (line 79-81) only checks for org roles and always navigates to `/dashboard`.

## Fix

**1. `src/pages/Auth.tsx`** — Update the redirect logic (lines 78-82) to check `isPlatformUser` before defaulting to `/dashboard`:

```tsx
if (user) {
  if (isPlatformUser) {
    navigate('/platform');
    return;
  }
  if (userOrgRoles.length > 0) {
    navigate('/dashboard');
    return;
  }
  ...
}
```

Pull `isPlatformUser` from the existing `useAuth()` hook (it's already available but not destructured on line 23).

**2. No other changes needed** — the `/platform` route and `RequirePlatformRole` guard already exist and work correctly.

