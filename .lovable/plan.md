

# Fix: Edge Function Fails on Resend Domain Restriction

## Problem
The `send-po` edge function throws a 500 error when Resend rejects the email (free tier only allows sending to the account owner's email). Because the error is thrown **before** the status update, the PO never transitions to SUBMITTED.

## Solution
Make the email send **non-blocking** for status updates. The PO should be marked SUBMITTED regardless of whether the email delivery succeeds. Email failure should be logged and returned as a warning, not block the entire operation.

## Changes

**`supabase/functions/send-po/index.ts`** (lines 177-208):
- Move the PO status update **before** checking the email result (or make it happen regardless)
- If email fails, still update PO to SUBMITTED but return `{ success: true, emailSent: false, emailError: "..." }` so the frontend knows
- This way the PO workflow progresses even when Resend has domain restrictions

Specifically:
1. After calling Resend API, always update PO status to SUBMITTED
2. If email failed, include a warning in the response but return 200
3. Log the email failure for debugging

This ensures testing works without a verified domain, and in production the email will just succeed normally.

