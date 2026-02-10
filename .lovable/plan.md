

# Update RESEND_API_KEY Secret

Replace the existing `RESEND_API_KEY` with a fresh key from your Resend dashboard.

## Steps

1. Use the secret update tool to prompt you for the new key value.
2. Redeploy the `send-notification-email` edge function to pick up the new key.
3. Run a quick test invocation to confirm the key works.

## What You Need

- Go to [resend.com/api-keys](https://resend.com/api-keys) and create a new API key (or copy an existing valid one).
- Have it ready to paste when prompted.

