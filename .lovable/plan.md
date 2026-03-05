

# Fix: Platform admin redirect race condition

## Root Cause
In `Auth.tsx`, the post-login useEffect depends on `[authLoading, user, userOrgRoles, needsOrgSetup, navigate, checkedPending]` but does NOT include `isPlatformUser`. When `fetchUserData` completes, `userOrgRoles` updates and triggers the effect, but `isPlatformUser` still reads as `false` (stale). The `userOrgRoles.length > 0` check fires first and sends the user to `/dashboard`.

## Fix
**`src/pages/Auth.tsx`** -- Add `isPlatformUser` to the useEffect dependency array (line ~99):

```tsx
}, [authLoading, user, userOrgRoles, needsOrgSetup, isPlatformUser, navigate, checkedPending]);
```

One-line change. This ensures the effect re-evaluates when `isPlatformUser` becomes `true`, and the `if (isPlatformUser)` check at the top of the effect correctly redirects to `/platform`.

