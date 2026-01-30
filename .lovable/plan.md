

# Plan: Update Dashboard "No Organization" State

## Problem
The Dashboard currently shows a "Create Organization" button when a user has no organization linked. However, since organizations are created during the signup process, this button and message are misleading.

## Solution

Update the "No Organization" state in the Dashboard to:
1. Remove the "Create Organization" button
2. Show an appropriate message explaining the situation
3. Provide a "Contact Support" or "Sign Out" option since this is an edge case that shouldn't normally occur

## Changes

### File: `src/pages/Dashboard.tsx`

**Current Code (lines 189-205):**
```tsx
if (!currentOrg) {
  return (
    <AppLayout title="Dashboard">
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">No Organization</h2>
            <p className="text-muted-foreground mb-4">
              You need to create an organization to get started.
            </p>
            <Button onClick={() => navigate('/#auth')}>Create Organization</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
```

**Updated Code:**
```tsx
if (!currentOrg) {
  return (
    <AppLayout title="Dashboard">
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Account Setup Incomplete</h2>
            <p className="text-muted-foreground mb-4">
              Your account is not linked to an organization. Please sign out and create a new account with your organization details.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => signOut()}>Sign Out</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
```

## Technical Details

- Import `signOut` from the `useAuth` hook (already available in the component via destructuring)
- Update the destructured values from `useAuth()` to include `signOut`
- Change the messaging to reflect that this is an incomplete account state rather than a "create organization" flow

## Testing

After this change:
1. If a user somehow ends up without an organization, they'll see a clear message
2. They can sign out and create a fresh account with proper organization setup
3. No confusing "Create Organization" button that doesn't actually create an organization

