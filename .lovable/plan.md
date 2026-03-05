

# Plan: Fix Impersonation "Return to Platform" Flow

## Problem
When a Platform Owner impersonates a user via "Login As", the stored original session tokens (access_token + refresh_token) can expire during the impersonation window. When `endImpersonation` calls `supabase.auth.setSession()` with expired tokens, it silently fails, leaving the platform owner stuck in the target user's account with no way back.

Additionally, the `endImpersonation` function referenced inside the `useEffect` timer is a stale closure (not in the dependency array), which can cause issues with the auto-timeout.

## Changes

### 1. Fix `useImpersonation.ts` — use `refreshSession` as fallback
**File: `src/hooks/useImpersonation.ts`**
- In `endImpersonation`, after attempting `setSession` with stored tokens, check if it succeeded
- If `setSession` fails (expired access_token), fall back to `supabase.auth.refreshSession({ refresh_token })` using only the stored refresh_token
- If both fail, sign out completely and redirect to `/auth` with a toast explaining the session expired
- Add `endImpersonation` to the `useEffect` dependency array and use a ref or move the function definition to avoid stale closures

### 2. Add error handling to the banner's return button
**File: `src/components/platform/ImpersonationBanner.tsx`**
- No structural changes needed — the fix is in the hook logic

