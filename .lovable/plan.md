

# Signup Flow Analysis and UX Improvement Plan

## Current Flow Summary

The signup has two paths:
1. **New org**: Choice → Account (name/email/password) → Company (org name/type/address) → Role (job title/trade) → Done
2. **Join existing**: Choice → Search org → Account (name/email/password/job title) → Join request submitted → Pending approval

Email verification is required. State is persisted to localStorage to survive the verification redirect.

## Bugs Found

### Bug 1: "Back" button on CompanyStep goes to ChoiceStep, skipping AccountStep
On the "new" path, CompanyStep's `onBack` calls `setSignupPath(null)` which shows the ChoiceStep. But the user already created an auth account in step 0. Going back to choice is confusing and potentially creates a second account attempt. It should go back to step 0 or be removed entirely since the account is already created.

### Bug 2: No password strength indicator
The password field accepts any 6+ character string. Industry standard is to show strength feedback (weak/medium/strong) to guide users toward better passwords.

### Bug 3: State field is a free-text input, not a dropdown
In CompanyStep, the State field is a plain text input. The JoinSearchStep already uses `US_STATES` as a dropdown. CompanyStep should do the same for consistency and to prevent typos.

### Bug 4: No "Terms of Service" or "Privacy Policy" acknowledgment
Industry standard for B2B SaaS signup requires at least a passive acknowledgment ("By signing up you agree to..."). Currently missing.

### Bug 5: Job title only shown for GC orgs in RoleStep
The RoleStep only shows job title selection when `orgType === 'GC'`. For Suppliers, there's no job title or trade prompt -- they just see a generic "You're all set" message. This is a missed opportunity to collect useful data. The join path correctly shows job title for all org types via `showJobTitle` prop.

### Bug 6: No navigation back from AccountStep on the "new" path
AccountStep has no back button. On the join path, JoinSearchStep has a back button, but when the user moves to AccountStep (step 1) there's no way back to the search step.

### Bug 7: Duplicate auth account creation on retry
If the user fills out AccountStep, hits signUp, gets an error (e.g., network timeout after the account was created), and retries, they'll get "User already registered." There's no recovery path -- no link to sign in with those credentials.

## Recommended UX Improvements

### 1. Password strength indicator
Add a visual strength meter below the password field showing weak/medium/strong based on length, mixed case, numbers, and special characters. This is industry standard (NIST 800-63B recommends guiding users toward stronger passwords without overly restrictive rules).

### 2. State dropdown in CompanyStep
Replace the free-text State input with a `Select` using the existing `US_STATES` array from `types/projectWizard.ts`.

### 3. Fix back navigation
- AccountStep ("new" path): Add a back button that returns to ChoiceStep (`setSignupPath(null)`). This is safe since no auth account exists yet at this point.
- CompanyStep: Change `onBack` to go to ChoiceStep (which it already does), but add a note that the account was already created so re-entering that flow won't duplicate.
- AccountStep ("join" path, step 1): Add a back button to return to JoinSearchStep (step 0).

### 4. Handle "User already registered" gracefully
In `handleAccountNext`, catch the "User already registered" error specifically and show a helpful message with a link to sign in, rather than a generic destructive toast.

### 5. Show job title for all org types in RoleStep
Move the job title selector out of the `orgType === 'GC'` condition so all org types can set a job title during signup.

### 6. Add Terms/Privacy acknowledgment
Add a small text line above the "Continue" button on AccountStep: "By creating an account, you agree to our Terms of Service and Privacy Policy."

## Changes

### 1. `src/components/signup-wizard/AccountStep.tsx`
- Add password strength indicator (computed from password value: length, uppercase, lowercase, number, special char)
- Add back button (accepting optional `onBack` prop)
- Add "User already registered" recovery link
- Add terms acknowledgment text below submit button

### 2. `src/components/signup-wizard/CompanyStep.tsx`
- Replace State `Input` with `Select` using `US_STATES`

### 3. `src/components/signup-wizard/RoleStep.tsx`
- Show job title selector for all org types, not just GC

### 4. `src/pages/Signup.tsx`
- Pass `onBack` to AccountStep on both paths
- In `handleAccountNext`, detect "User already registered" error and show inline recovery UI instead of just a toast

