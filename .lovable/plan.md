
# Fix: Join Organization Flow -- Add "Pending Approval" State

## Problem

After a new user submits a join request to an organization, they have no org roles yet (approval is pending). Every time they sign in:
1. Auth page detects `needsOrgSetup` (no org roles) and redirects to `/signup`
2. `/signup` shows the choice screen again since there's no saved context
3. User is stuck in an infinite loop with no indication their request is pending

## Root Cause

No code path handles the "authenticated user with a pending join request but no org role" state.

## Solution

### 1. Add a check for pending join requests in Auth.tsx (src/pages/Auth.tsx)

Before redirecting to `/signup` when `needsOrgSetup` is true, query `org_join_requests` for the current user with status = 'pending'. If found, show a "Pending Approval" card instead of redirecting to signup.

The card will display:
- "Your request to join [org name] is pending"  
- "You'll be notified when approved"
- A "Sign Out" button
- A "Cancel & Start Over" option (deletes the join request and redirects to `/signup`)

### 2. Add the same check in Signup.tsx (src/pages/Signup.tsx)

When the signup page loads with an authenticated user who has no org roles and no localStorage data, check for pending join requests. If found, show the pending approval state instead of the choice screen.

### 3. Update the post-join-request navigation (src/pages/Signup.tsx)

After successfully submitting a join request (both in `handleAccountNext` and the restore `useEffect`), instead of navigating to `/auth`, stay on `/signup` and show the pending approval state directly. This avoids the redirect loop entirely.

## Technical Details

### New component: PendingApprovalCard

Create a simple card component at `src/components/signup-wizard/PendingApprovalStep.tsx` that shows:
- Icon and heading: "Request Pending"
- Organization name
- Message about waiting for admin approval  
- "Sign Out" button
- "Cancel Request" link

### Changes to Auth.tsx (lines 62-75)

Add a query for pending join requests when `needsOrgSetup` is true. Show the pending card if found, otherwise redirect to `/signup` as before.

### Changes to Signup.tsx

- Add state `pendingOrg` (string | null) to track if user has a pending request
- In the restore `useEffect`, after join request submission, set `pendingOrg` instead of navigating away
- In the choice screen render (line 302-308), first check for pending join requests before showing `ChoiceStep`
- When `pendingOrg` is set, render the `PendingApprovalStep` component

### Flow After Fix

1. User selects org, creates account, verifies email
2. Join request auto-submitted from localStorage
3. User sees "Your request to join IMIS, LLC is pending approval" card
4. If they sign out and sign back in, Auth.tsx detects the pending request and shows the same card
5. Once admin approves, `user_org_roles` populates and user gets redirected to dashboard
