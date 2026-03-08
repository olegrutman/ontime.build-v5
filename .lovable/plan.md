

# Fix Support Action Logging

## Problem
The `platform-support-action` edge function calls `log_support_action` RPC with wrong parameter names. The RPC expects parameters like `p_action_type`, `p_reason`, `p_target_user_id`, etc., but the edge function passes `_performed_by`, `_action_type`, `_target_type`, `_target_id`, `_snapshot_before`, `_snapshot_after`. Since all RPC params have defaults of NULL, the call succeeds silently but inserts nothing useful (or fails the NOT NULL constraint silently).

## RPC Signature
```
p_target_org_id uuid, p_target_org_name text, p_target_project_id uuid, 
p_target_project_name text, p_target_user_id uuid, p_target_user_email text,
p_action_type text, p_action_summary text, p_reason text, 
p_before_snapshot jsonb, p_after_snapshot jsonb
```

The RPC also calls `auth.uid()` internally, but the edge function uses the `adminClient` (service role) to call it, so `auth.uid()` returns NULL, causing the `is_platform_user` check to fail and raising an exception.

## Fix: `supabase/functions/platform-support-action/index.ts`

1. Switch the `log_support_action` RPC call to use the **user's client** (`userClient`) instead of `adminClient`, so `auth.uid()` resolves correctly inside the function.

2. Update the RPC parameters to match the actual function signature. For each action type, resolve and pass the correct target fields:
   - `p_action_type` (was `_action_type`)
   - `p_reason` (was `_reason`) 
   - `p_before_snapshot` / `p_after_snapshot` (was `_snapshot_before` / `_snapshot_after`)
   - `p_target_user_id`, `p_target_user_email`, `p_target_org_id`, `p_target_org_name`, `p_target_project_id`, `p_target_project_name` — populated based on the action context
   - `p_action_summary` — a human-readable summary string

3. Build a `logParams` object throughout each action case that accumulates the target details, then pass them all in the final RPC call.

### Files
- `supabase/functions/platform-support-action/index.ts` — Fix the logging RPC call at the bottom (~lines 593-602)

