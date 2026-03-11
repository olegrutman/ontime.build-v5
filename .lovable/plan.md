

# Fix: Download Edge Functions Skip JWT Validation

## Problem
Four edge functions check only that an `Authorization` header is *present* (e.g. `startsWith('Bearer ')`) but never validate the JWT token. They then query data using the **service role key**, bypassing all RLS. Any caller who supplies `Bearer anything` can download any record by UUID.

**Affected functions:** `invoice-download`, `work-order-download`, `project-summary-download`, `return-credit-memo`

**Reference:** `po-download` already implements proper auth — it creates a user-scoped client with `getClaims()` validation and queries via RLS.

## Fix (same pattern for all 4 functions)

Replace the header-presence check with actual JWT validation using `getClaims()`, then use a **user-scoped client** (anon key + user token) for data queries so RLS is enforced. The service role client is removed from the main query path.

```typescript
// 1. Validate JWT
const token = authHeader.replace('Bearer ', '');
const userClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: `Bearer ${token}` } },
});
const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
}

// 2. Query using userClient (RLS-enforced) instead of service role
const { data, error } = await userClient.from('table').select('*')...
```

### Per-function changes

| Function | Current auth | Data client | Fix |
|----------|-------------|-------------|-----|
| `invoice-download` | `startsWith('Bearer ')` only | service role | Add `getClaims()`, switch to user client |
| `work-order-download` | `startsWith('Bearer ')` only | service role | Add `getClaims()`, switch to user client |
| `project-summary-download` | `startsWith('Bearer ')` only | service role | Add `getClaims()`, switch to user client |
| `return-credit-memo` | `if (!authHeader)` only | service role | Add `getClaims()`, switch to user client |

All 4 functions already have `verify_jwt = false` in `config.toml` — that stays unchanged. The `supabaseAnonKey` env var needs to be added to `project-summary-download` and `return-credit-memo` (they currently only import the service key).

