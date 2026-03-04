

# Fix Team Management Bugs

## Bugs Found During Testing

### Bug 1: Admin cannot update another member's job title (CRITICAL)
**Root cause**: The `profiles` table RLS policy only allows `user_id = auth.uid()` for updates. When an admin tries to update another member's job title, the query silently affects zero rows — no error, but no update either. The toast falsely reports success.

**Fix**: Create an RPC `update_member_job_title(_target_user_id uuid, _job_title text)` with `SECURITY DEFINER` that:
- Verifies the caller is admin of the same org as the target user
- Updates `profiles.job_title` for the target user
- Update `useOrgTeam.updateMemberJobTitle` to call this RPC instead of direct table update

### Bug 2: `selectedMember` state goes stale after updates
**Root cause**: In `OrgTeam.tsx`, when permissions or job title are saved, `fetchData()` refreshes the `members` array, but `selectedMember` still holds the old object reference. The dialog shows stale data until closed and reopened.

**Fix**: In `OrgTeam.tsx`, add a `useEffect` that syncs `selectedMember` with the refreshed `members` array:
```typescript
useEffect(() => {
  if (selectedMember) {
    const updated = members.find(m => m.id === selectedMember.id);
    if (updated) setSelectedMember(updated);
  }
}, [members]);
```

### Bug 3: Both members show "Admin" badge
**Status**: This is a data issue, not a code bug. Both Allen and John have `is_admin = true` in the DB for the same org. The `transfer_admin` RPC correctly sets one to false and one to true, but the current data state has both as admin (likely from test setup). No code change needed.

## Changes

### 1. Database: Create `update_member_job_title` RPC
- `SECURITY DEFINER` function
- Validates caller is admin in same org as target user
- Updates `profiles.job_title`

### 2. `src/hooks/useOrgTeam.ts`
- Change `updateMemberJobTitle` to call the new RPC instead of direct profile update

### 3. `src/pages/OrgTeam.tsx`
- Add `useEffect` to sync `selectedMember` with refreshed `members` array after any data change

