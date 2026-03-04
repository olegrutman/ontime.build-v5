

# Improve Role Display and Job Title Assignment for Team Members

## Problem
For GC organizations, the system role is `GC_PM` which displays as "General Contractor Manager" for every member. The actual job title (Project Manager, Office Manager, Foreman, etc.) exists on the profile but:
1. The member list badge shows the system role, not the job title
2. Admins cannot edit a team member's job title — only the member themselves can set it on their Profile page
3. The invite form role dropdown has only one option ("General Contractor Manager") for GC orgs, making it feel broken

## Analysis from Live Data
- Allen Rutman: job_title = "Office Manager" (shows in secondary text but badge says "General Contractor Manager")
- John Smith: job_title = "Project Manager" (same issue)
- Greg Clark: job_title = null (no title set at all)

## Changes

### 1. `src/pages/OrgTeam.tsx` — Show job title prominently, allow admin to edit it
- In the members list, display `job_title` as the badge instead of the system role label when a job title exists. Fall back to system role label when no job title is set.
- Hide the role-change dropdown for single-role orgs (it currently hides due to `allowedRoles.length > 1` check, which is correct)

### 2. `src/components/team/MemberDetailDialog.tsx` — Add job title editing
- Add a "Job Title" section visible to admins when viewing another member
- Show a Select dropdown with the standard `JOB_TITLES` list (Owner, Project Manager, Superintendent, Estimator, Office Manager, Foreman, Other)
- Save via a direct `supabase.from('profiles').update({ job_title }).eq('user_id', member.user_id)` call
- Accept a new `onUpdateJobTitle` callback prop

### 3. `src/hooks/useOrgTeam.ts` — Add `updateMemberJobTitle` function
- New function that updates the profile's `job_title` for a given `user_id` and refetches the member list

### 4. `src/pages/OrgTeam.tsx` — Wire job title update
- Pass `onUpdateJobTitle` to the `MemberDetailDialog`
- After update, refetch members to show the new title

### Bugs identified
- **Job title not shown in badge**: The badge always shows `ROLE_LABELS[m.role]` which is the system role, not the cosmetic job title. For single-role orgs this is redundant and unhelpful.
- **No admin control over member job titles**: Only the user themselves can set their job title via Profile. Admins should be able to set it for their team members.

