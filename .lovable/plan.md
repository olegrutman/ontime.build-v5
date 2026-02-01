
# Plan: Fix Supplier Project Invite Acceptance Issue

## Problem Summary

When a TC invites a Supplier via the "Search Existing" flow in the Project Team tile, the Supplier cannot accept the invite from their dashboard.

## Root Cause Analysis

After extensive investigation, I found that:

1. **The database functions are correct** - `accept_project_invite` includes SUPPLIER in `can_accept_project_invite`
2. **The invite data exists** - Both `project_team` and `project_participants` entries are correctly created
3. **The matching logic should work** - The fallback query in `accept_project_invite` correctly finds the `project_team` entry

However, there's an **inconsistency between the two invitation flows**:

| Flow | Creates `project_team` | Creates `project_invites` |
|------|------------------------|---------------------------|
| **Search Existing** (handleAddExisting) | Yes | **NO** |
| **Invite by Email** (handleInviteByEmail) | Yes | Yes |

While the `accept_project_invite` function has a fallback that should work without `project_invites`, this inconsistency could cause issues with:
- The notification system expecting a `project_invites` record
- Invite tracking and resend functionality
- Edge cases in the matching logic

## Solution

Add `project_invites` record creation to the "Search Existing" flow in `AddTeamMemberDialog.tsx` to ensure consistent behavior.

---

## File Changes

| File | Change |
|------|--------|
| `src/components/project/AddTeamMemberDialog.tsx` | Add project_invites creation in handleAddExisting |

---

## Implementation Details

### Update handleAddExisting Function

After successfully inserting into `project_team`, also create a corresponding `project_invites` record:

```typescript
// Current code (lines 295-308):
const { data: teamData, error: teamError } = await supabase
  .from('project_team')
  .insert({...})
  .select('id')
  .single();

if (teamError) throw teamError;

// ADD THIS: Create project_invites record for existing orgs too
await supabase.from('project_invites').insert({
  project_id: projectId,
  project_team_id: teamData.id,
  role: selectedRole,
  trade: requiresTrade(selectedRole) ? selectedTrade : null,
  invited_email: selectedResult.contact_email,
  invited_name: selectedResult.contact_name,
  invited_org_name: selectedResult.org_name,
  invited_by_user_id: user.id,
});
```

### Key Changes

1. Modify the `project_team` insert to return the created `id`
2. Create a corresponding `project_invites` record linked via `project_team_id`
3. This ensures both invitation flows create the same database records

---

## Expected Behavior After Fix

1. **TC invites Supplier** via "Search Existing"
   - Creates `project_team` entry (status: Invited)
   - Creates `project_invites` entry (status: Invited)
   - Trigger creates `project_participants` entry (invite_status: INVITED)

2. **Supplier sees invite** in Dashboard
   - `useDashboardData` fetches from `project_participants` correctly

3. **Supplier clicks Accept**
   - `accept_project_invite` RPC finds matching invite via primary lookup (now works)
   - Updates `project_invites.status` to 'Accepted'
   - Updates `project_team.status` to 'Accepted'
   - Updates `project_participants.invite_status` to 'ACCEPTED'

---

## Technical Details

The fix ensures consistency in the invitation flow by creating matching records in both `project_team` and `project_invites` tables, regardless of whether the invite was sent via "Search Existing" or "Invite by Email".
