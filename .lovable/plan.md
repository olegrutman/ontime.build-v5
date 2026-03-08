

# Add "Send Nudge" Reminder Feature Across All Processes — COMPLETED

## What It Does
Users can send a "Send Reminder" nudge to the other party when an invoice, WO, PO, or return is awaiting action. Server-enforced 24h cooldown prevents spam.

## Changes Made

### Database (1 migration)
- Added `NUDGE` to `notification_type` enum
- Created `nudge_log` table with RLS
- Created `send_nudge(_entity_type, _entity_id)` RPC (SECURITY DEFINER) that validates state, enforces cooldown, and inserts notification

### Frontend
- **`src/hooks/useNudge.ts`** — Shared hook wrapping the RPC call with loading/sent state
- **`InvoiceDetail.tsx`** — "Send Reminder" button when status=SUBMITTED and user is invoice creator
- **`PODetail.tsx`** — "Send Reminder" button when status=SUBMITTED and user is buyer (not supplier)
- **`ReturnDetail.tsx`** — "Send Reminder" button when status=SUBMITTED and user is creator org
- **`WorkItemActions.tsx`** — "Send Reminder" button when state=PRICED and user is TC

### Email
- Added `NUDGE: "notify_email"` to `send-notification-email` edge function
