

# Fix: Preserve Signup Context After Email Verification

## Problem

When a user chooses the "Join an existing company" path and creates their account, they must verify their email before getting a session. After clicking the verification link, they land on the root URL and get redirected to `/signup` -- but all wizard state (selected organization, name, phone, etc.) is lost. They have to start the entire process over.

The same issue affects the "New to Ontime.Build" path: after email verification, company and role data entered before verification is gone.

## Solution

Persist the signup wizard data in `localStorage` before showing the "check your email" toast. When the signup page loads and detects an authenticated user with no org roles, check for saved data and automatically resume where they left off.

## Changes

### 1. `src/pages/Signup.tsx`

**Save data before showing email toast (in `handleAccountNext`, around line 118-125):**
- Before showing the "Check your email" toast, save the full wizard `data` object, `signupPath`, and current `step` to `localStorage` under a key like `ontime_pending_signup`

**Restore data on load (new `useEffect` after line 58-62):**
- When the page loads, if `user` exists and `userOrgRoles.length === 0` (authenticated but no org), check `localStorage` for `ontime_pending_signup`
- If found, restore `data`, `signupPath`, and advance to the correct step:
  - For "join" path: auto-submit the join request immediately (user already verified, we have orgId and profile data)
  - For "new" path: restore to step 1 (company step) so they can continue the wizard

**Clean up localStorage:**
- After successful signup completion (in `handleFinalSubmit` and the join-request block), remove the `ontime_pending_signup` key

### 2. Also update `emailRedirectTo`

- Change `emailRedirectTo` from `window.location.origin` to `window.location.origin + '/signup'` so verified users land directly on the signup page instead of going through `/` -> redirect chain

## Flow After Fix

1. User selects org, fills account details, clicks Continue
2. Email verification required -- data saved to localStorage, toast shown
3. User clicks verification link in email -> lands on `/signup`
4. Signup page detects: authenticated user + no org + saved data in localStorage
5. **Join path**: automatically submits join request with saved org ID, shows success
6. **New path**: restores to company step so user continues from where they left off
7. localStorage cleaned up after completion

