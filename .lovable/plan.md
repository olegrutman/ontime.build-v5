

# Promote owner@ontime.build to Platform Owner

Your account was found:
- **Email**: owner@ontime.build
- **User ID**: `bd196a35-e30f-4a42-8c5c-d310be318ec3`

## What I'll do

Run a single SQL insert to add you to the `platform_users` table:

```sql
INSERT INTO public.platform_users (user_id, platform_role, two_factor_verified)
VALUES ('bd196a35-e30f-4a42-8c5c-d310be318ec3', 'PLATFORM_OWNER', true);
```

This sets you as **Platform Owner** with 2FA marked as verified (placeholder), giving you full access to `/platform`.

## Important note

Your email still needs to be confirmed before you can sign in. You should have received a verification email at owner@ontime.build. Click the link in that email first, then sign in and navigate to `/platform` to access the admin portal.

