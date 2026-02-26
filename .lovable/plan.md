

# Fix: TC Organization Name Not Visible to GC in Assignment Step

## Root Cause

The `organizations` table RLS policy checks if two orgs share a project by querying `project_participants`. However, `project_participants` has its own RLS that restricts the GC user to only see rows where their own org is the participant (or where their org owns the project). Since this project is owned by the TC org, the GC user can only see their own participant row in the subquery -- so the TC org is never found and returns "Unknown".

This is a nested RLS visibility problem, not a frontend bug.

## Fix: Security Definer Function

Create a `SECURITY DEFINER` function that checks whether an organization shares a project with the current user, bypassing the nested RLS issue. Then update the `organizations` SELECT policy to use this function instead of the raw subquery through `project_participants`.

### Step 1: Create `org_shares_project_with_user` function

```sql
CREATE OR REPLACE FUNCTION public.org_shares_project_with_user(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project_participants pp1
    JOIN project_participants pp2 ON pp1.project_id = pp2.project_id
    WHERE pp1.organization_id IN (
      SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
    )
    AND pp2.organization_id = _org_id
  )
$$;
```

### Step 2: Update the organizations SELECT policy

Replace the current `project_participants` subquery in the RLS policy with a call to the new function:

```sql
DROP POLICY "Users can view related organizations" ON public.organizations;

CREATE POLICY "Users can view related organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (
  -- User belongs to this org
  id IN (SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid())
  -- Org shares a project with user (via security definer)
  OR org_shares_project_with_user(id)
  -- Org is a trusted partner
  OR id IN (
    SELECT partner_org_id FROM trusted_partners
    WHERE organization_id IN (
      SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
    )
  )
);
```

### No Frontend Changes Needed

Once the RLS is fixed, the existing `AssignmentStep.tsx` code (which queries `organizations` directly) will correctly return the TC org name. The "Unknown" label and the direct/fallback query pattern already in the component will work as intended.

## Technical Details

- The `SECURITY DEFINER` function runs with the privileges of its creator, bypassing the nested RLS on `project_participants`
- This is the standard Supabase pattern for avoiding recursive/nested RLS issues
- The function is `STABLE` (safe for query optimization) and has `search_path = public` (security best practice)
- The trusted_partners subquery does not have the same nested RLS issue, so it can remain as-is

