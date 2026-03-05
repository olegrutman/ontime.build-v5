

# Fix: Platform Users Cannot See Data

## Root Cause

The RLS SELECT policies on `organizations`, `profiles`, and `projects` restrict visibility to org members and project participants. The platform owner (`owner@ontime.build`) has zero `user_org_roles` entries, so every query returns `[]`.

The `support_actions_log` table already has the correct pattern: `is_platform_user(auth.uid())`.

## Fix

Add a SELECT policy on each table that grants platform users full read access using the existing `is_platform_user()` security definer function.

### Database Migration

```sql
-- Organizations: platform users can view all
CREATE POLICY "Platform users can view all organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (is_platform_user(auth.uid()));

-- Profiles: platform users can view all
CREATE POLICY "Platform users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (is_platform_user(auth.uid()));

-- Projects: platform users can view all
CREATE POLICY "Platform users can view all projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (is_platform_user(auth.uid()));
```

### No Code Changes Required

The dashboard, org list, user list, and project detail pages already query these tables correctly. Once RLS allows platform users to read, all counts, lists, and detail views will populate.

### Scope

- 3 new RLS policies (all SELECT-only, read-only access)
- No frontend changes
- No edge function changes

