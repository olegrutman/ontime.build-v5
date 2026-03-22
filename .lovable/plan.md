

# Fix: RLS Policy on `project_profiles` Blocks Non-Owner Org Users

## Root Cause

The ALL policy on `project_profiles` ("Project creator can manage profile") checks if the user's org matches `projects.organization_id`. But when a TC creates a project, `organization_id` = TC's org. The GC (who is on `project_team` but in a different org) fails this check and gets a 403 on INSERT.

## Fix — Database Migration

Replace the ALL policy with one that checks `project_team` membership instead of org ownership. Any accepted team member on the project should be able to manage the profile (the UI already gates this to the project creator):

```sql
DROP POLICY "Project creator can manage profile" ON public.project_profiles;

CREATE POLICY "Project team can manage profile" ON public.project_profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_team pt
      WHERE pt.project_id = project_profiles.project_id
        AND pt.user_id = auth.uid()
        AND pt.status = 'Accepted'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_team pt
      WHERE pt.project_id = project_profiles.project_id
        AND pt.user_id = auth.uid()
        AND pt.status = 'Accepted'
    )
  );
```

Also update the SELECT policy to match (or just rely on the ALL policy which covers SELECT too — remove the separate SELECT policy to avoid redundancy):

```sql
DROP POLICY "Project participants can view profiles" ON public.project_profiles;
```

**One migration file**, two DROP + one CREATE. No frontend changes needed.

