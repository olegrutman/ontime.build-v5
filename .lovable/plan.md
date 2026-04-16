

# Why TC Dashboard Shows Zero Projects

## Root Cause

**The seed function was never executed.** The database contains zero QA projects, zero `project_participants` rows, and zero documents for the test accounts. The edge function was deployed and booted, but never called with `{ action: 'seed' }`.

The `/platform/qa` page (where the "Seed QA Environment" button lives) is gated behind `RequirePlatformRole`, which means only the platform owner account can access it — not `gc_test`, `tc_test`, `fc_test`, or `supp_test`.

## Fix — Two Options

### Option A: Invoke the seed directly (recommended)
I will call the `seed-qa-environment` edge function directly using the Supabase CLI/curl tool, bypassing the UI entirely. This avoids the platform-owner gate issue.

### Option B: Temporarily allow gc_test to trigger
Add a bypass or invoke via the Supabase test tool.

## Plan (Option A)

1. **Invoke the seed function** using `supabase--curl_edge_functions` with `{ "action": "seed" }` and the GC test user's auth token (or service role key)
2. **Verify data** — query `projects`, `project_participants`, `purchase_orders`, `change_orders`, `invoices` to confirm all 7 projects and their documents were created
3. **Confirm TC visibility** — verify `project_participants` has rows with `organization_id = TC_ORG_ID` and `invite_status = 'ACCEPTED'`

No code changes needed. The edge function and dashboard code are correct — the data just needs to be seeded.

