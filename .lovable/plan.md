
# Fix: Unable to Sign Out in Preview

## Problem

When you try to sign out, the server returns a 403 "Session not found" error (because the server-side session has already expired). The current `signOut` code calls `supabase.auth.signOut()` but doesn't handle this failure -- so the local auth tokens in localStorage may not get fully cleared. After the page reload, the stale tokens get picked up again and you appear "stuck" logged in.

## Fix

### 1. Update `signOut` in `src/hooks/useAuth.tsx`

- Use `supabase.auth.signOut({ scope: 'local' })` which forces clearing the local session regardless of what the server returns. This is the correct approach when the server session may already be expired.
- Wrap in try/catch so even if the call throws, we still clear state and redirect.

### 2. Add a "Sign Out" option to the Landing page header

Currently the landing page (`LandingHeader`) doesn't show a sign-out option when a user is logged in. If the router sends a logged-in user to `/`, they see the marketing page with no way to sign out. We'll add a small "Sign Out" button or link in the landing header when a session exists.

## Changes

**`src/hooks/useAuth.tsx`** -- Update signOut:
```
const signOut = async () => {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (_) {
    // Force-clear even if server rejects
  }
  setUser(null);
  setSession(null);
  setProfile(null);
  setUserOrgRoles([]);
  setMemberPermissions(null);
  window.location.href = '/';
};
```

**`src/components/landing/LandingHeader.tsx`** -- Show a "Sign Out" button when user is logged in, so they can escape the stuck state from the landing page too.
