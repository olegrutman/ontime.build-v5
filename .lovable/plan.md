

# Add `type="tel"` to All Phone Input Fields

## Problem

Phone number fields in the Profile page are missing `type="tel"`, so on mobile they show a regular text keyboard instead of the phone dialer keypad. The Signup page was already fixed, but other phone fields were missed.

## Changes

**File: `src/pages/Profile.tsx`**

Two phone fields need `type="tel"` added:

1. **Personal Phone Number** (line 333): Add `type="tel"` to the Input
2. **Company Phone** (line 493): Add `type="tel"` to the Input

## No Other Files Need Changes

- `src/components/signup-wizard/AccountStep.tsx` -- already has `type="tel"` (fixed in last edit)
- `src/components/landing/AuthSection.tsx` -- no phone input field rendered (phone is just stored in form data)

## Summary

| File | Field | Fix |
|------|-------|-----|
| `src/pages/Profile.tsx` line 333 | Personal Phone Number | Add `type="tel"` |
| `src/pages/Profile.tsx` line 493 | Company Phone | Add `type="tel"` |

