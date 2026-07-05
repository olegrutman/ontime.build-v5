# Overnight Fix Log

## ✅ Shipped this session

### Auth
- **Phone signup path disabled entirely.** No more `phone-placeholder@ontime.build` fake users. Method toggle hidden on both Sign In and Sign Up until phone auth is properly wired.
- **"UI preview only" label removed** — the phone tab that carried it no longer renders.
- **OTP code length corrected from 8 → 6 digits** to match Supabase-sent codes.
- **Google OAuth redirect fixed** — now points to `/auth/callback` on both `AuthPage.tsx` and legacy `Auth.tsx` (previously landed users on site root, appearing signed out).
- **Sign In wrapped in `<form>`** — Enter key now submits from the email field, not just the password field. Social/forgot buttons marked `type="button"` so they don't submit the form.

### GC Project Overview
- **Deleted `src/pages/GCProjectOverview.tsx`** — this was a 484-line static mockup with hardcoded "5 Cherry Hills Park" / "Derek Kowalski" data being served on the live route `/project/:id/gc-overview`.
- **Route now redirects** to the real `ProjectHome` page.
- Also removed the dead `console.log('save contract', contract)` handler that lived in that file.

### Settings
- **"Delete Account" button was fully dead** (no onClick). Now shows a clear toast explaining self-service deletion is not enabled and to contact support. Button relabeled "Request Deletion" so it isn't misleading.

### Brand consistency
- Standardized all "OnTime.Build" → "Ontime.Build" across `Auth.tsx`, `AuthCallback.tsx`, `VerifyEmail.tsx`, `ResetPassword.tsx`, `Install.tsx`, `Signup.tsx`.

### Verification
- `tsgo --noEmit` passes cleanly.

---

## ⏭️ Skipped (with reason)

- **FC Cash Position formula** — audit claimed `totalPaid - 0`; actual code (`useDashboardData.ts:770`) is `paidToYou - paidByYou`, which is correct. Not a real bug.
- **`FS` role "bypass"** — `FS` (Field Supervisor) is intentionally in both TC and FC org types per `organization.ts:90-91`. This is the designed role model, not a bug.
- **`TC_PM` `canApprove: false` default** — this is intentional per the role matrix; changing it silently would grant approval rights to every TC_PM. Needs your explicit sign-off.
- **380 hardcoded color classes / 100+ inline styles** — sweep would touch hundreds of files and risk visual regressions across the entire app. Needs a supervised effort, not overnight autonomous changes.
- **Skeletons for 38 pages / empty states** — same reason: each page has a unique layout; unattended mass changes will produce ugly, inconsistent skeletons.
- **Impersonation token storage** — moving off `sessionStorage` requires an edge-function-issued short-lived JWT + cookie plumbing. Non-trivial security change, needs your review.
- **Server-side platform admin gate** — needs a new edge function + RLS policy. Won't ship without you.
- **Returns pricing corruption loop** — could not reproduce without real data.
- **Two parallel signup flows (`/auth` vs `/signup`)** — merging is a product decision.
- **Landing copy honesty** — marketing decision.
- **Focus traps on custom bottom sheets** — high regression risk without manual QA.

---

## Recommended next steps for you

1. **Do a smoke test of sign-in / sign-up / Google OAuth** in preview to confirm the auth changes feel right.
2. **Decide the design-system sweep** — I can do it in one pass if you accept the risk, or we do it page-by-page.
3. **Give me the go-ahead on `TC_PM canApprove`** — should it default true or stay false?
4. **Tell me if you want to keep `/auth` (old page) or delete it in favor of `/AuthPage`.** Right now both exist and diverge slightly.
