

# Fix: Seed Data Visibility for All Test Accounts

## Root Cause
The `seed-qa-environment` edge function writes `invite_status: 'accepted'` (lowercase) to `project_participants`, but:
- The dashboard (`useDashboardData.ts` line 178) queries `.eq('invite_status', 'ACCEPTED')` (uppercase)
- All existing records in the database use `ACCEPTED` (uppercase)

This means **seeded projects are invisible** to TC and FC accounts on their dashboards.

## Fix (1 file)

### `supabase/functions/seed-qa-environment/index.ts`

**Line 330-332** — Change `invite_status` values from lowercase to uppercase:
- `'accepted'` → `'ACCEPTED'`
- `'pending'` → `'PENDING'` (for the messy FC cases)

**Line 366** — Change contract `fcStatus` comparison:
- `fcStatus === 'accepted'` → `fcStatus === 'ACCEPTED'`

**Line 328** — Update the ternary producing `fcStatus`:
- `'pending'` → `'PENDING'`, `'accepted'` → `'ACCEPTED'`

That's ~6 line edits total in the edge function. No other files need changes.

## Supplier Visibility
Supplier dashboard works differently — it queries `purchase_orders` by `supplier_id`, not `project_participants`. The seeded POs already reference the correct `SUPPLIER_ID`, so supplier visibility will work once the seed runs.

## After Fix
1. Deploy updated edge function
2. Navigate to `/platform/qa`
3. Click "Clear QA Data" (if previously seeded)
4. Click "Seed QA Environment"
5. Log in as each test account to verify all 12 projects appear

