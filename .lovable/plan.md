

# Comprehensive Email Verification Flow Fix

## Bugs Found

### Bug 1: No email verification callback page
When users click the verification link in their email, they land on `/signup` with auth hash params. There is no dedicated page to handle the verification callback, show success feedback, or handle errors like expired/invalid links. The auth logs show `"One-time token not found"` and `"Email link is invalid or has expired"` -- users see nothing useful when this happens.

### Bug 2: Unhelpful "Email not confirmed" error
When a user tries to sign in before verifying their email, they see the raw error "Email not confirmed". Industry-standard apps show a clear message like "Please verify your email first" with a **resend verification email** button.

### Bug 3: No way to resend verification email
If the verification link expires (common -- links are typically valid for 1 hour), users are completely stuck. There is no "Resend verification email" option anywhere.

### Bug 4: Cross-device verification breaks the flow
The `emailRedirectTo` points to `/signup`, and localStorage holds the wizard state. If a user signs up on desktop but opens the verification email on their phone, localStorage is empty and the flow breaks -- they see the choice screen again with no context.

### Bug 5: No "Check your email" interstitial page
After signing up, the user just sees a toast notification and stays on the same form. Industry-standard apps show a dedicated "Check your email" screen with the email address, instructions, and a resend option.

---

## Solution: Industry-Standard Email Verification Flow

### New Page: `/verify-email` (Check Your Email screen)
After signup, redirect users here instead of showing a toast. This page shows:
- A mailbox icon
- "Check your email" heading
- "We sent a verification link to **user@email.com**"
- "Click the link in your email to verify your account"
- "Didn't receive it?" with a **Resend Email** button (with cooldown timer)
- "Wrong email?" link to go back to signup
- "Already verified?" link to sign in

### New Page: `/auth/callback` (Verification Callback handler)
This page handles the redirect from the email verification link:
- Parses the auth hash/query params from the URL
- Shows a spinner while verifying
- On **success**: Shows a checkmark with "Email verified!" and auto-redirects to `/signup` (to resume the wizard with localStorage data) or `/auth` (to sign in)
- On **error** (expired/invalid link): Shows a clear error message with a "Resend verification email" button

### Update Auth.tsx: Better "Email not confirmed" handling
When sign-in fails with "Email not confirmed":
- Show a specific message: "Your email hasn't been verified yet"
- Show a **Resend verification email** button inline
- After resend, show success feedback with the same "check your email" guidance

### Update Signup.tsx: Redirect to `/verify-email` after signup
Instead of showing a toast and staying on the form:
- Save wizard state to localStorage (already done)
- Navigate to `/verify-email?email=user@email.com`

---

## Files to Create

### 1. `src/pages/VerifyEmail.tsx`
The "Check your email" interstitial page with:
- Email display from URL query param
- Resend button with 60-second cooldown
- Links to go back or sign in

### 2. `src/pages/AuthCallback.tsx`
The verification callback handler that:
- Processes the auth hash from the verification link
- Shows loading, success, or error states
- On success: clears URL hash, redirects to `/signup` (if localStorage has pending data) or `/auth`
- On error: shows the specific error and resend option

## Files to Modify

### 3. `src/App.tsx`
- Add routes for `/verify-email` and `/auth/callback`

### 4. `src/pages/Signup.tsx`
- In `handleAccountNext`, when no session (email needs verification), navigate to `/verify-email?email=...` instead of showing a toast
- Update `emailRedirectTo` to point to `window.location.origin + '/auth/callback'`

### 5. `src/pages/Auth.tsx`
- Detect "Email not confirmed" error specifically
- Show inline "Resend verification email" button when this error occurs
- After resend, show confirmation message

### 6. `src/hooks/useAuth.tsx`
- Update `emailRedirectTo` in signUp to point to `/auth/callback`

---

## User Flow After Fix

### Happy Path (same device)
1. User fills out signup form, clicks Continue
2. Redirected to `/verify-email` -- sees "Check your email" with their email shown
3. Opens email, clicks verification link
4. Lands on `/auth/callback` -- sees spinner, then "Email verified!" checkmark
5. Auto-redirected to `/signup` where localStorage data resumes the flow
6. Join request submitted automatically (join path) or wizard continues (new path)

### Expired Link
1. User clicks expired verification link
2. Lands on `/auth/callback` -- sees "This link has expired"
3. Enters email and clicks "Resend verification email"
4. Gets new email, clicks new link -- flow continues

### Different Device
1. User clicks verification link on phone (no localStorage)
2. Lands on `/auth/callback` -- sees "Email verified!"
3. Redirected to `/auth` (no localStorage data to restore)
4. Signs in on their original device where localStorage data resumes the flow

### Trying to Sign In Before Verifying
1. User enters email/password on `/auth`
2. Sees "Your email hasn't been verified yet" with resend button
3. Clicks resend, gets new email, verifies, then signs in successfully
