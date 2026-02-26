

# Remove the Auth Section from the Landing Page

## What Changes

Remove the sign-in/sign-up form tile that appears near the bottom of the landing page. Users will still be able to sign in and sign up via the dedicated `/auth` and `/signup` routes -- this just removes the duplicate embedded form from the landing page.

## Files to Edit

### 1. `src/pages/Landing.tsx`
- Remove the `<AuthSection />` component from the rendered output
- Remove `AuthSection` from the import statement

### 2. `src/components/landing/index.ts`
- Remove the `AuthSection` export line

No other files need to change. The `AuthSection.tsx` file itself can remain in the codebase in case it's needed later, or be deleted for cleanup.
