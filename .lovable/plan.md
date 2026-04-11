

# Implement New Auth Design from ontime-auth.html

## Summary of what gets archived

**Pages (5 files):**
- `src/pages/Auth.tsx` — current sign-in page
- `src/pages/Signup.tsx` — current multi-step signup wizard
- `src/pages/VerifyEmail.tsx` — email verification waiting screen
- `src/pages/AuthCallback.tsx` — OAuth/email callback handler
- `src/pages/ResetPassword.tsx` — password reset form

**Signup wizard components (9 files):**
- `src/components/signup-wizard/AccountStep.tsx`
- `src/components/signup-wizard/CompanyStep.tsx`
- `src/components/signup-wizard/RoleStep.tsx`
- `src/components/signup-wizard/InviteDetectedStep.tsx`
- `src/components/signup-wizard/ChoiceStep.tsx`
- `src/components/signup-wizard/JoinSearchStep.tsx`
- `src/components/signup-wizard/PendingApprovalStep.tsx`
- `src/components/signup-wizard/index.ts`
- `src/components/signup-wizard/types.ts`

All moved to `_archived/auth/` preserving original filenames.

**NOT archived** (shared, still used):
- `src/hooks/useAuth.tsx` — auth context/provider (kept, wired into new screens)
- `src/components/ui/*` — shared UI primitives
- `src/components/ui/OntimeLogo.tsx` — logo component
- `src/lib/formatPhone.ts` — phone formatter
- `src/integrations/supabase/client.ts` — Supabase client

---

## New files to create

| File | Purpose |
|---|---|
| `src/styles/auth.css` | All CSS from the HTML reference (design tokens, brand panel, form panel, OTP grid, role cards, responsive breakpoints) |
| `src/pages/AuthPage.tsx` | Single page component hosting all 5 screens with internal state-based navigation (`goTo`) |
| `src/components/auth/BrandPanel.tsx` | Left navy panel with logo, hero copy, features, trust strip |
| `src/components/auth/SignInScreen.tsx` | Email/phone toggle, password with show/hide, Google social, forgot link |
| `src/components/auth/SignUpScreen.tsx` | 3-step flow: account fields + OTP verify + role/company select |
| `src/components/auth/ForgotScreen.tsx` | Email/phone toggle, confirmation state |
| `src/components/auth/SuccessScreen.tsx` | Animated checkmark, account summary, dashboard CTA |
| `src/components/auth/OTPInput.tsx` | 6-cell custom OTP grid with auto-focus, paste, arrow nav, shake animation |
| `src/components/auth/PasswordStrength.tsx` | 4-bar strength meter component |
| `src/components/auth/RoleSelector.tsx` | 2x2 role card grid (GC/TC/Crew/Supplier), scoped selection |
| `src/components/auth/MethodToggle.tsx` | Email/Phone toggle pill component |
| `src/components/auth/StepIndicator.tsx` | 3-step progress circles with done/active states |
| `src/components/auth/AuthButton.tsx` | Primary CTA with loading spinner |

## Files to modify

| File | Change |
|---|---|
| `src/App.tsx` | Update imports: replace old Auth/Signup/VerifyEmail/AuthCallback/ResetPassword with new `AuthPage`. Routes `/auth`, `/signup`, `/verify-email` all point to `AuthPage` (screen selection via URL param or state). Keep `/reset-password` and `/auth/callback` routes pointing to preserved logic inside AuthPage. |
| `index.html` | Add Google Fonts link for Barlow Condensed, DM Sans, IBM Plex Mono |

---

## Key implementation details

**No Join screen** — per your answers, phone auth is UI-only, no Microsoft button. The HTML reference includes a join flow but the spec says to skip it since the existing join/invite system stays as-is (kept in current email-link verification). The 4 screens implemented are: sign-in, sign-up (3-step), forgot, success.

**Auth wiring:**
- `handleSignIn()` → calls existing `signIn()` from `useAuth` (email+password). Phone toggle is UI-only (shows fields but submits as demo/placeholder).
- `handleSignUpStep1()` → calls existing `signUp()` from `useAuth` (creates account, triggers email verification link per current flow). OTP screen shows "check your email" messaging since we keep current email-link verification.
- `verifyOTP()` → UI-only demo behavior (code "000000" = error, anything else = advance to step 3). Real verification happens via email link as it does today.
- `finishSignUp()` → navigates to success screen, then dashboard.
- Forgot password → calls existing `supabase.auth.resetPasswordForEmail()`.
- Google OAuth → calls existing `lovable.auth.signInWithOAuth('google')`.

**Mock data kept as constants** (commented-out ready for future API):
```ts
const MOCK_ORGS = [ /* ... */ ];
const INVITE_CODES = { /* ... */ };
```

**Responsive:** Brand panel hidden below 860px, mobile brand bar shown instead. Card padding reduces at 480px. All per the HTML reference.

---

## No conflicts or open questions

- Database schema unchanged (no new tables needed)
- `useAuth` hook unchanged
- Invite code / join flow kept as mock data only
- Phone auth is visual-only, no backend changes

