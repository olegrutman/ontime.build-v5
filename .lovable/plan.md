
# Make Email Notifications Work

## Current State

Your notification system is currently **in-app only**. Database triggers correctly create rows in the `notifications` table for events like project invites, invoice submissions, PO sends, and change order updates. Users see these in the bell icon sheet. However, **no email is ever sent** for any of these events.

The good news: all the building blocks already exist.

| Building Block | Status |
|---|---|
| RESEND_API_KEY secret | Configured |
| `user_settings.notify_email` preference | Exists |
| `profiles.email` for recipients | Exists |
| 7 notification triggers writing to `notifications` table | Active |
| Resend email sending (proven via `send-po`) | Working |

## What Needs to Be Built

### 1. New Edge Function: `send-notification-email`

A new backend function that receives a notification payload, looks up the recipient's email and notification preferences, and sends a formatted email via Resend.

**Logic flow:**
```text
Notification trigger fires
  -> Row inserted into notifications table
  -> Database trigger calls edge function via pg_net
  -> Edge function:
     1. Receives notification data (recipient_org_id, type, title, body, action_url)
     2. Finds users in that org via org_members
     3. For each user:
        a. Check user_settings.notify_email = true
        b. Check category preference (notify_invites, notify_invoices, notify_change_orders)
        c. Look up email from profiles table
        d. Send formatted email via Resend API
```

### 2. Database Trigger: Fire Edge Function on New Notification

A new `AFTER INSERT` trigger on the `notifications` table that calls the edge function using `pg_net` (Supabase's built-in HTTP extension for async calls from triggers).

```text
CREATE TRIGGER trg_send_notification_email
AFTER INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION send_notification_email_trigger();
```

The trigger function will use `net.http_post()` to call the edge function with the new notification's data.

### 3. Notification Type to Preference Mapping

Map each notification type to the correct user_settings column:

| Notification Type | Setting Column |
|---|---|
| PROJECT_INVITE | notify_invites |
| WORK_ITEM_INVITE | notify_invites |
| WORK_ORDER_ASSIGNED | notify_invites |
| PO_SENT | notify_email (general) |
| CHANGE_SUBMITTED | notify_change_orders |
| CHANGE_APPROVED | notify_change_orders |
| CHANGE_REJECTED | notify_change_orders |
| INVOICE_SUBMITTED | notify_invoices |
| INVOICE_APPROVED | notify_invoices |
| INVOICE_REJECTED | notify_invoices |

### 4. Email Template

A clean, branded HTML email template that includes:
- OntimeBuild header
- Notification title (bold)
- Notification body text
- "View in App" button linking to action_url
- Footer with unsubscribe hint (link to profile settings)

### 5. Resend Domain Requirement

Currently the `send-po` function uses `onboarding@resend.dev` as the sender. This is Resend's sandbox domain and has limitations:
- Can only send to the email address that owns the Resend account
- Emails may be flagged as spam

**To send emails to any user, you need to:**
1. Go to https://resend.com/domains
2. Add and verify your domain (e.g., `ontimebuild.com` or `ontime.build`)
3. Add the DNS records Resend provides (SPF, DKIM, DMARC)
4. Once verified, update the "from" address to use your domain (e.g., `notifications@ontime.build`)

This is the single most important step -- without a verified domain, emails will only reach the Resend account owner.

## Technical Details

### Files to Create/Modify

| File | Action |
|---|---|
| `supabase/functions/send-notification-email/index.ts` | **New** -- Edge function to send email via Resend |
| Database migration | **New** -- Add `pg_net` trigger on notifications table |
| `supabase/config.toml` | Add function config (verify_jwt = false since called from DB trigger) |

### Edge Function Design

The function will:
- Accept POST with `{ notification_id, recipient_org_id, type, title, body, action_url }`
- Use service role to query `org_members` -> `profiles` -> `user_settings`
- Filter out users with email notifications disabled (globally or per-category)
- Send individual emails via Resend API (batch if multiple org members)
- Log success/failure for debugging

### Database Trigger Function

```text
CREATE FUNCTION send_notification_email_trigger()
  -- Uses net.http_post() to call the edge function
  -- Passes NEW.id, NEW.recipient_org_id, NEW.type, NEW.title, NEW.body, NEW.action_url
  -- Runs asynchronously (non-blocking)
```

### Security

- Edge function uses `verify_jwt = false` (called from DB trigger, not from browser)
- Authenticates via a shared `SUPABASE_SERVICE_ROLE_KEY` check or an internal secret
- Service role access for reading user preferences and emails

## Prerequisites (Action Required From You)

1. **Verify a domain on Resend** -- Go to https://resend.com/domains, add your domain, and complete DNS verification. Without this, emails can only reach the Resend account owner's address.

2. **Confirm the sender address** -- Once domain is verified, decide on the "from" address (e.g., `notifications@ontime.build`, `noreply@ontimebuild.com`).

3. **Enable pg_net extension** -- This is typically enabled by default on Supabase/Lovable Cloud, but will be verified during implementation.

Once you confirm the domain is verified and provide the sender address, the implementation can proceed immediately.
