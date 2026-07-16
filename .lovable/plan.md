# Path A — Web Push Notifications (PWA)

Deliver real pop-up notifications on desktop browsers, Android, and installed iOS 16.4+ home-screen apps, driven off the existing `notifications` table.

## What the user gets

- Bell badge and toast when a notification arrives while the app is open (already partially works — toast is new).
- OS-level pop-up on lock screen / notification tray when the app is closed, on any device where the user has granted permission.
- A **Settings → Notifications** panel to enable, disable, and send a test notification. Clear instructions for iOS users to "Add to Home Screen" first.
- No behavior change for users who never opt in.

## Scope of work

### 1. Fix the service worker
Rewrite `public/sw.js` as a minimal, dependency-free messaging worker:
- Remove the broken `import { precacheAndRoute } from 'workbox-precaching'` (crashes registration today).
- Keep only `push` and `notificationclick` handlers.
- No app-shell caching, no precache manifest.
- Focus an existing tab on the target URL if open, otherwise open a new one.

### 2. Guarded registration
- Register the worker only from `usePushNotifications` after the user opts in, and only when: production build, not inside an iframe, hostname is not a Lovable preview/dev host.
- On every load, if a stale registration exists in a preview/dev context, unregister it.

### 3. VAPID keys + secrets
- Generate a VAPID keypair once, store `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto) as backend secrets via `set_secret`.

### 4. Two edge functions
- `get-vapid-key` — returns the public key to the browser (no JWT needed).
- `send-push-notification` — JWT-verified for the test path; service-role for the trigger path. Signs VAPID JWT, POSTs to each endpoint, deletes subscriptions on 404/410 responses, logs failures.

### 5. Database
- Confirm `push_subscriptions` table exists with correct RLS (user can CRUD own rows only). Add if missing.
- Add `notification_deliveries` log (channel, status, error, notification_id) for debugging.
- Add `AFTER INSERT` trigger on `notifications` → async `pg_net` call to `send-push-notification` with the recipient's active subscriptions. Idempotent per notification id.

### 6. Settings UI
- New card in `Settings.tsx`: permission state, subscribe/unsubscribe toggle, "Send test" button, iOS install hint when the browser is iOS Safari and not in standalone mode.

### 7. In-app toast on realtime insert
- In `useNotifications`, when the realtime `INSERT` fires and the tab is visible, call `toast(title, { description: body, action: navigate to url })` via sonner.
- On `visibilitychange` back to visible, refetch list + unread count (fixes missed events while backgrounded).

### 8. Preferences (minimal, extensible)
- Add `notification_preferences` (user_id, channel, enabled, per-type overrides JSON). Default: all in-app on, push off until opted in.
- Trigger checks preferences before enqueueing push.

## Not in scope (call out separately if wanted later)

- Email digest channel, quiet hours, per-type granular toggles UI, rate-limit/collapse bursts.
- Native Capacitor push (Path B).
- Any change to app-shell caching or offline behavior.

## Technical details

**Files created**
- `supabase/functions/get-vapid-key/index.ts`
- `supabase/functions/send-push-notification/index.ts`
- `src/components/settings/NotificationSettingsCard.tsx`

**Files modified**
- `public/sw.js` — rewrite, no imports, push + click only.
- `src/hooks/usePushNotifications.ts` — add preview/iframe guards; wire real registration path.
- `src/hooks/useNotifications.ts` — sonner toast on realtime insert; `visibilitychange` refetch.
- `src/pages/Settings.tsx` — mount `NotificationSettingsCard`.

**Migrations**
- Ensure `public.push_subscriptions` (user_id, endpoint unique, p256dh_key, auth_key, user_agent, created_at) with RLS + GRANTs.
- `public.notification_deliveries` (id, notification_id fk, channel, status, error, delivered_at) with service-role-only writes.
- `public.notification_preferences` (user_id pk, push_enabled bool, in_app_enabled bool, overrides jsonb).
- Trigger `notifications_after_insert_push` → `pg_net.http_post` to `send-push-notification` with header `x-internal-secret` (new random secret via `generate_secret`) so the function trusts internal calls without a user JWT.

**Security**
- Function validates `x-internal-secret` header OR a valid user JWT (test path only, sends only to caller's own subscriptions).
- `notification_deliveries` writes only from service role.
- All new tables enable RLS with owner-only policies plus explicit GRANTs per Cloud rules.

**iOS caveat surfaced in UI**
- Detect iOS Safari + `display-mode: standalone`. If not standalone, show "Add to Home Screen to enable notifications on iPhone".

## Rollout order
1. Migrations (tables, trigger stub without http_post).
2. Edge functions + VAPID secrets.
3. SW rewrite + hook guards.
4. Settings card + sonner toast.
5. Enable trigger's `pg_net` call once functions are live.
6. Manual test: opt in on desktop Chrome, trigger a CO submit, confirm OS pop-up + delivery row.
