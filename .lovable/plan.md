

# Platform Admin Portal — Bug Report

## Confirmed Bugs

### Bug 1: `project_team.organization_id` does not exist (400 error)

**Severity: HIGH** — Org Detail page fails to load projects.

The `PlatformOrgDetail.tsx` (line ~63) queries `project_team` filtering by `organization_id`, but the actual column is `org_id`. This returns a 400 error visible in the network requests:

```
column project_team.organization_id does not exist
```

**Fix:** Change `.eq('organization_id', orgId!)` to `.eq('org_id', orgId!)` in `PlatformOrgDetail.tsx`.

---

### Bug 2: Org member counts always show 0

**Severity: HIGH** — Orgs list and Org Detail show 0 members.

The `user_org_roles` SELECT RLS policy uses `user_in_org(auth.uid(), organization_id)` — platform users without org memberships get 0 rows. The platform RLS policy was only added for `organizations`, `profiles`, and `projects`, but **not** for `user_org_roles`.

Both `PlatformOrgs.tsx` (member count via embedded `user_org_roles(count)`) and `PlatformOrgDetail.tsx` (member list) and `PlatformUserDetail.tsx` (org memberships) return empty.

**Fix:** Add a SELECT RLS policy on `user_org_roles`:
```sql
CREATE POLICY "Platform users can view all user_org_roles"
  ON public.user_org_roles FOR SELECT
  TO authenticated
  USING (is_platform_user(auth.uid()));
```

---

### Bug 3: Missing RLS for `project_team`, `purchase_orders`, `invoices`, `work_items`

**Severity: HIGH** — Project Detail page shows 0 for PO/Invoice/WO counts and empty team list.

None of these tables have platform-user SELECT policies. The `PlatformProjectDetail` page queries all four tables but gets empty results.

**Fix:** Add SELECT policies on `project_team`, `purchase_orders`, `invoices`, and `work_items` using `is_platform_user(auth.uid())`.

---

### Bug 4: Dashboard "Projects" tile links to `/platform/orgs` instead of a projects list

**Severity: LOW** — In `PlatformDashboard.tsx` line 42, the Projects tile has `href: '/platform/orgs'` instead of a dedicated projects page or at minimum a different route.

**Fix:** Either create a `/platform/projects` list page or change the href to something meaningful.

---

### Bug 5: Impersonation doesn't return session tokens

**Severity: HIGH** — "Login As" succeeds (200) but doesn't actually swap the session.

The `platform-impersonate` edge function generates a magic link via `generateLink({ type: "magiclink" })` and tries to return `properties.access_token` / `properties.refresh_token`. However, `generateLink` returns a URL with a one-time token — it does NOT return `access_token`/`refresh_token` in `properties`. The client receives `{ success: true, target_email: "..." }` with `access_token: undefined`, so `setSession` fails silently.

The network response confirms: `{"success":true,"target_email":"olegrutman+321@gmail.com"}` — no tokens.

**Fix:** The edge function needs to either:
- Use `admin.generateLink({ type: 'magiclink' })` and then verify the OTP server-side to get actual tokens, or
- Use a different approach: call `auth.admin.createSession()` or sign in with the OTP on the server side and return the resulting session tokens.

---

### Bug 6: `auth.getClaims(token)` may not exist in supabase-js v2

**Severity: MEDIUM** — Both edge functions use `userClient.auth.getClaims(token)` which is not a standard method in `@supabase/supabase-js@2`. The correct method is `auth.getUser(token)`. This currently works because the edge functions return 200 (maybe the Deno supabase client has it), but it's fragile.

**Fix:** Replace `getClaims` with `auth.getUser(token)` and extract `sub` from `data.user.id`.

---

### Bug 7: `RESEND_INVITE` action not implemented

**Severity: LOW** — Listed in `ACTION_MIN_ROLE` but no `case "RESEND_INVITE"` in the switch block of `platform-support-action`. It falls through to the default `Not implemented` response.

---

## Summary of Required Changes

| Priority | Bug | Fix |
|----------|-----|-----|
| HIGH | Wrong column name `organization_id` → `org_id` | Edit `PlatformOrgDetail.tsx` |
| HIGH | Missing RLS on `user_org_roles` for platform users | DB migration |
| HIGH | Missing RLS on `project_team`, `purchase_orders`, `invoices`, `work_items` | DB migration |
| HIGH | Impersonation returns no session tokens | Rewrite `platform-impersonate` token generation |
| MEDIUM | `getClaims` not standard API | Replace with `getUser` in both edge functions |
| LOW | Projects tile links to orgs | Fix href in `PlatformDashboard.tsx` |
| LOW | `RESEND_INVITE` not implemented | Add case in edge function |

