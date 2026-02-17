

# Add Job Title to Join Flow and Show on Team Page

## Overview
When a new user signs up to join an existing organization, they will be asked for their **job title** before submitting the join request. The admin will see this job title when reviewing join requests, and can assign the appropriate role. The team page will also display each member's job title alongside their role.

## Changes

### 1. Database: Add `job_title` column to `org_join_requests` and `profiles`

- Add a `job_title` column to `org_join_requests` so the requesting user's stated title is visible to the admin
- The `profiles` table already has columns but may need a `job_title` column if not present -- will store it there upon approval

### 2. Signup Flow: Add Job Title Field for Join Path

**File: `src/components/signup-wizard/types.ts`**
- Already has `jobTitle` field in the wizard data type (no change needed)

**File: `src/pages/Signup.tsx`**
- Before submitting the join request, show a job title input field on the Account step (or as a small addition before the join request is sent)
- Store the `job_title` in the `org_join_requests` row when inserting

### 3. Join Request Review: Show Job Title to Admin

**File: `src/pages/OrgTeam.tsx`**
- In the Join Requests section, display the user's stated job title next to their name
- Fetch `job_title` from the `org_join_requests` table

### 4. Team Members: Show Job Title

**File: `src/pages/OrgTeam.tsx`**
- In the Members section, display each member's job title below their name/email
- Fetch `job_title` from `profiles` table (joined via the existing FK)

**File: `src/hooks/useOrgTeam.ts`**
- Update the profiles query to also fetch `job_title`

### 5. Update `approve_join_request` RPC

- When approving, copy the `job_title` from the join request into the user's `profiles` row
- Keep the current auto-role-assignment logic (admin can change the role afterward via the existing dropdown on the team page)

## Technical Details

### Migration SQL
```sql
-- Add job_title to org_join_requests
ALTER TABLE public.org_join_requests ADD COLUMN job_title TEXT;

-- Add job_title to profiles (if not exists)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT;

-- Update approve_join_request to copy job_title to profile
CREATE OR REPLACE FUNCTION public.approve_join_request(_request_id UUID)
RETURNS VOID ...
-- (adds: UPDATE profiles SET job_title = _req.job_title WHERE user_id = _req.user_id)
```

### Frontend Changes Summary

| File | Change |
|------|--------|
| `src/pages/Signup.tsx` | Add job title input before join request submission; include `job_title` in the insert |
| `src/pages/OrgTeam.tsx` | Show job title in join requests list and members list |
| `src/hooks/useOrgTeam.ts` | Include `job_title` in profile fetch |
| `src/components/signup-wizard/types.ts` | No change needed (already has `jobTitle`) |
| Database migration | Add `job_title` column, update RPC |

