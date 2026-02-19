

# Security Issues Fix Plan

## Summary of Issues

There are **7 active security findings** across three scanners. Here is what needs to be fixed, grouped by priority.

---

## Issue 1 (CRITICAL): Project Invites Publicly Readable

**Problem:** The `project_invites` table has a policy `Anyone can view invite by token` that grants the `anon` role full SELECT access (`qual: true`). This means unauthenticated users can read all invitations, exposing emails, names, and tokens.

**Fix:**
- Drop the `anon` SELECT policy on `project_invites`
- The existing authenticated policy (`Users can view invites`) already correctly restricts to inviter or invited email
- If token-based lookup is needed (e.g. for the accept-invite flow), create a narrow policy that only allows anon to see rows matching a specific token via an RPC function instead

---

## Issue 2 (CRITICAL): Send-PO Edge Function Has No Auth Check

**Problem:** The `send-po` function accepts `po_id` and `supplier_email` from any caller (no JWT verification, no auth check). It uses the service role key to fetch PO data, bypassing all RLS. Anyone can send any PO to any email address.

**Fix (in `supabase/functions/send-po/index.ts`):**
1. Require and validate the Authorization header at the top of the handler
2. Use an RLS-enabled client (anon key + user token) to fetch the PO, so only POs the user has access to can be sent
3. Add basic email format validation
4. Keep the service role client only for the status update at the end (or use the user client if RLS allows updates)

---

## Issue 3 (CRITICAL): SECURITY DEFINER Functions Missing Authorization

**Problem:** Several database functions with `SECURITY DEFINER` accept a UUID and operate on it without verifying the caller has access. An attacker who discovers a UUID can call these RPCs directly.

**Affected functions:**
- `execute_change_work(change_work_id)` -- no ownership check
- `submit_tm_period(period_id)` -- no ownership check
- `approve_tm_period(period_id)` -- no ownership check
- `reject_tm_period(period_id)` -- no ownership check

**Fix (SQL migration):**
Add authorization checks to each function. For example, verify `user_in_org(auth.uid(), organization_id)` on the related work item before proceeding. If the check fails, raise an exception.

---

## Issue 4 (CRITICAL): Organizations Table Overly Permissive

**Problem:** The `organizations` table has a SELECT policy `Authenticated users can view organizations` with `qual: true`, meaning any logged-in user can see every organization's name, address, phone, license, and insurance details.

**Fix:**
- Replace the broad `true` policy with one that restricts visibility to:
  - Organizations the user belongs to (`user_org_roles`)
  - Organizations connected via shared projects (`project_participants`)
  - Organizations in the user's trusted partners list
- Note: The `search_invite_targets` and `search_existing_team_targets` functions already use `SECURITY DEFINER` to search organizations, so they will continue to work even with tighter RLS.

---

## Issue 5 (WARN): SOV Templates Publicly Accessible

**Problem:** `sov_templates` has a SELECT policy for the `public` role with `qual: true`. Templates are readable without any authentication.

**Fix:**
- Drop the `Anyone can view SOV templates` policy
- Create a new policy requiring authentication: `auth.uid() IS NOT NULL`

---

## Issue 6 (WARN): PO Download Tokens Never Expire

**Problem:** The `po-download` edge function accepts a `download_token` (UUID) that never expires and has no rate limiting. If the token leaks, it provides permanent access to PO data.

**Fix (SQL migration + edge function update):**
1. Add `download_token_expires_at` column to `purchase_orders` (default 30 days from creation)
2. Add `download_count` column (default 0)
3. In `po-download/index.ts`, check expiration and increment download count
4. Regenerate token when PO is re-sent

---

## Issue 7 (WARN): Leaked Password Protection Disabled

**Problem:** The built-in leaked password protection feature is disabled.

**Fix:** Enable leaked password protection via the authentication configuration. This is a settings change, not a code change.

---

## Implementation Order

1. **Database migration** -- RLS policy changes for `project_invites`, `organizations`, `sov_templates`; add authorization to SECURITY DEFINER functions; add PO token expiration columns
2. **Edge function: `send-po`** -- Add authentication and authorization
3. **Edge function: `po-download`** -- Add token expiration check
4. **Auth config** -- Enable leaked password protection

## Technical Details: SQL Migration

```sql
-- 1. Fix project_invites: drop anon SELECT
DROP POLICY IF EXISTS "Anyone can view invite by token" ON project_invites;

-- 2. Fix sov_templates: require authentication
DROP POLICY IF EXISTS "Anyone can view SOV templates" ON sov_templates;
CREATE POLICY "Authenticated users can view SOV templates"
  ON sov_templates FOR SELECT
  TO authenticated
  USING (true);

-- 3. Fix organizations: restrict visibility
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON organizations;
CREATE POLICY "Users can view related organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid())
    OR id IN (
      SELECT pp2.organization_id FROM project_participants pp1
      JOIN project_participants pp2 ON pp1.project_id = pp2.project_id
      WHERE pp1.organization_id IN (
        SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
      )
    )
    OR id IN (
      SELECT partner_org_id FROM trusted_partners
      WHERE organization_id IN (
        SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
      )
    )
  );

-- 4. Add PO token expiration
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS download_token_expires_at
    TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

-- 5. Fix SECURITY DEFINER functions (execute_change_work, submit/approve/reject_tm_period)
-- Each gets an authorization guard using user_in_org(auth.uid(), ...) 
-- before performing any data changes
```

## Technical Details: Edge Function Changes

**`send-po/index.ts`:**
- Extract and validate JWT from Authorization header at the start
- Replace service-role PO fetch with user-authenticated client (RLS enforced)
- Add email format validation
- Return 401 if no valid auth

**`po-download/index.ts`:**
- In token-based mode, add check: `WHERE download_token = ? AND download_token_expires_at > now()`
- Increment `download_count` after successful download
- Return 410 Gone if token expired

## Files Modified

```
supabase/migrations/XXXXXXX_fix_security_issues.sql  -- NEW
supabase/functions/send-po/index.ts                   -- Auth + validation
supabase/functions/po-download/index.ts               -- Token expiration
```

