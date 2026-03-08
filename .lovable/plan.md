

# Add Password Reset Flow

## Current State
- No forgot password link on the Auth page
- No `/reset-password` page exists
- The landing page has a non-functional "Forgot Password?" button

## Plan

### 1. Add "Forgot password?" link to Auth page (`src/pages/Auth.tsx`)
- Add a "Forgot password?" button/link below the password field
- On click, show an inline email input (or toggle a "forgot password" mode) that calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`
- Show success message after sending

### 2. Create `/reset-password` page (`src/pages/ResetPassword.tsx`)
- Public route (no auth required)
- On mount, check URL hash for `type=recovery` token — Supabase auto-sets the session
- Show a form with new password + confirm password fields
- Call `supabase.auth.updateUser({ password })` to save
- On success, redirect to `/dashboard` with a toast

### 3. Register route in `src/App.tsx`
- Lazy-load `ResetPassword` page
- Add `<Route path="/reset-password" element={<ResetPassword />} />`  as a public route

### Files to Change
- `src/pages/Auth.tsx` — Add forgot password toggle + reset email sender
- `src/pages/ResetPassword.tsx` — New page for setting new password
- `src/App.tsx` — Register the new route

