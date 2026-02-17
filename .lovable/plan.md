
# Fix: Approved Team Member Not Appearing in Members List

## Problem
When an admin approves a join request on the Team page, the join request disappears from the "Join Requests" section, but the newly added member does not appear in the "Members" list. The admin has to leave and return to the page to see the new member.

## Root Cause
In `OrgTeam.tsx`, the `handleApproveJoinRequest` function (line 118-122) only calls `fetchJoinRequests()` after a successful approval. It does **not** call the `refetch` function from the `useOrgTeam` hook, so the members list remains stale.

## Fix

### File: `src/pages/OrgTeam.tsx`

1. Destructure `refetch` from the `useOrgTeam()` hook (line 39 already returns it, but it's not being used)
2. In `handleApproveJoinRequest`, call `refetch()` alongside `fetchJoinRequests()` after a successful approval

Changes:
- Line 39: Add `refetch` to the destructured values from `useOrgTeam()`
- Line 120: Add `refetch()` call after `fetchJoinRequests()`

This is a single-file, two-line frontend fix. No database changes needed.
