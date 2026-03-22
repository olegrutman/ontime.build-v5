

# Fix: Deploy `generate-sov` Edge Function

## Root Cause

The `generate-sov` edge function code exists in `supabase/functions/generate-sov/index.ts` but was never deployed. The network request returns 404 ("Requested function was not found"), and there are zero edge function logs — confirming the function doesn't exist on the backend yet.

## Fix

Deploy the edge function. No code changes needed — the function source is correct (CORS headers, auth verification, AI call, SOV item insertion all look good).

### Action
- Deploy edge function `generate-sov`

That's it. The function code is already complete and correct. Once deployed, the "Generate" button on the SOV page will work.

