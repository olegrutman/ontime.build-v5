

# Fix: RESEND_API_KEY Validation Regex Bug

## Problem

The email notification trigger fix is working -- the edge function IS now being called by the database trigger. However, the edge function fails at line 226 with "RESEND_API_KEY contains invalid characters" because the regex validation has a bug.

The regex `/[\\x00-\\x1F\\x7F]/` uses double-escaped backslashes. In a JavaScript regex literal, `\\x00` doesn't match the NULL control character -- it matches the literal characters `\`, `x`, `0`, `0`. This causes any Resend API key (which contains characters like `x`) to falsely trigger the validation, blocking all email sends.

## Fix

Remove the overly aggressive API key validation entirely. The Resend SDK will return a clear error if the key is invalid -- there's no need to pre-validate it with a regex.

## File Changes

| File | Change |
|---|---|
| `supabase/functions/send-notification-email/index.ts` | Remove lines 225-232 (the broken regex validation block) |

## Verification

After deploying, we'll call the edge function directly with a test payload to confirm emails are sent successfully.

