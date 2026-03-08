

# Add "Send Nudge" Reminder Feature Across All Processes

## What It Does

When you submit an invoice, WO, PO, or return and the other party hasn't taken action, you can tap a **"Send Reminder"** button to nudge them. This inserts a new notification of type `NUDGE` to the recipient org, with a cooldown (once per 24 hours per entity) to prevent spam.

## Where the Button Appears

| Process | Who sees the button | When it's visible | Recipient |
|---------|-------------------|-------------------|-----------|
| **Invoice** | Sender (from_org) | Status = SUBMITTED | Receiver (to_org) |
| **Work Order** | Submitter org | Status = ready_for_approval | GC (project owner) |
| **Purchase Order** | Buyer org | Status = SUBMITTED | Supplier org |
| **Return** | Creator org | Status = SUBMITTED | Supplier org |

## Database Changes (1 migration)

1. Add `NUDGE` to `notification_type` enum
2. Create a `nudge_log` table to enforce cooldown:
   ```
   nudge_log (
     id uuid PK,
     entity_type text,      -- 'invoice', 'work_order', 'purchase_order', 'return'
     entity_id uuid,
     sent_by uuid,          -- user who nudged
     sent_to_org uuid,      -- recipient org
     created_at timestamptz
   )
   ```
3. Create an RPC function `send_nudge(entity_type, entity_id)` that:
   - Validates the caller has permission (is part of the sending org)
   - Checks cooldown (no nudge for same entity in last 24h)
   - Inserts into `nudge_log`
   - Inserts a `NUDGE` notification to the recipient org
   - Returns success/error message

## Email Notification

Add `NUDGE` to the `TYPE_TO_PREFERENCE` map in `send-notification-email/index.ts` so nudges also trigger email delivery (mapped to `notify_email`).

## UI Changes (4 files)

Each detail component gets a small "Send Reminder" button with a bell icon, visible only to the sending party when the item is in a "waiting for action" status:

1. **`InvoiceDetail.tsx`** — button next to "Export PDF" when status = SUBMITTED and user is sender
2. **`PODetail.tsx`** — button when status = SUBMITTED and user is buyer org
3. **`ReturnDetail.tsx`** — button when status = SUBMITTED and user is creator org
4. **Work Order detail page** — button when status = ready_for_approval and user is submitter

Each button calls `supabase.rpc('send_nudge', { _entity_type, _entity_id })` and shows a toast on success or cooldown error.

## Shared Hook

Create `src/hooks/useNudge.ts`:
- Wraps the RPC call with loading state
- Shows success toast ("Reminder sent") or cooldown toast ("Already sent a reminder recently")
- Returns `{ sendNudge, loading }`

## Cooldown UX

After a successful nudge, the button text changes to "Reminder Sent" (disabled) for the rest of the session. The 24h cooldown is enforced server-side — if someone reloads and tries again within 24h, the RPC returns an error and the toast says "You already sent a reminder for this item today."

