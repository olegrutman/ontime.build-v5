

# Fix: Email Notifications Not Firing

## Problem

The database trigger `trg_send_notification_email` fires on every new notification (29 exist), but the HTTP call to the edge function **never executes**. The trigger function reads `app.settings.service_role_key` to authorize the call, but that custom PostgreSQL setting is NULL -- it was never configured, and `ALTER DATABASE` is not allowed in Lovable Cloud.

Result: the `IF` guard silently skips the HTTP call every time.

## Solution

Replace the service-role-key auth approach with the **anon key** (which is public and safe to hardcode) and change the edge function to `verify_jwt = false` (already set). The edge function already validates `Authorization: Bearer <service_role_key>`, but since the trigger can't access the service role key, we'll switch to a different auth model:

1. **Trigger function**: Hardcode the anon key and send it as the Authorization header. Since the function has `verify_jwt = false`, this will pass through.
2. **Edge function**: Instead of checking `token === serviceRoleKey`, validate that the request comes from a trusted source by checking for a shared secret header (`x-trigger-secret`) that we store as both a database secret (via Vault) and an edge function secret.

Actually, a simpler and equally secure approach: since `verify_jwt = false` is already set, and the edge function is only called by the DB trigger (not exposed to users), we can use a lightweight shared secret approach, or even simpler -- just use the anon key for the Bearer token since the function doesn't verify JWT anyway.

## Revised Approach (Simplest)

The edge function currently checks `token === serviceRoleKey`. We'll change it to accept the **anon key** as well, since both are available: the anon key can be hardcoded in the trigger, and the edge function has access to both keys via environment variables.

### Database Migration

Replace the trigger function to use the anon key directly (it's a public key, safe to embed):

```sql
CREATE OR REPLACE FUNCTION public.send_notification_email_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://gzqgbfazwvmwmirbqfwf.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_KEY>',
      'x-trigger-secret', 'internal-db-trigger'
    ),
    body := jsonb_build_object(
      'notification_id', NEW.id,
      'recipient_org_id', NEW.recipient_org_id,
      'recipient_user_id', NEW.recipient_user_id,
      'type', NEW.type,
      'title', NEW.title,
      'body', NEW.body,
      'action_url', NEW.action_url
    )
  );
  RETURN NEW;
END;
$$;
```

### Edge Function Update

Update `send-notification-email/index.ts` to authenticate via the `x-trigger-secret` header instead of comparing against the service role key:

```typescript
// Replace the current auth check with:
const triggerSecret = req.headers.get("x-trigger-secret");
if (triggerSecret !== "internal-db-trigger") {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}
```

This is simple and secure because:
- The edge function already has `verify_jwt = false`
- The `x-trigger-secret` value is only known to the DB trigger (not exposed to frontend)
- No external user can guess the header value

## File Changes

| File | Change |
|---|---|
| New migration SQL | Replace trigger function to use anon key + custom secret header |
| `supabase/functions/send-notification-email/index.ts` | Replace auth check: use `x-trigger-secret` header instead of service role key comparison |

## Risk

- **Low**: The edge function is already `verify_jwt = false`. Adding a shared secret header is strictly more secure than the current (broken) setup.
- Existing 29 notifications won't retroactively send emails, but all new ones will.
