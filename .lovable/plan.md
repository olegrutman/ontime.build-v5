

# Restrict RFI Answering to Assigned Organization

## Problem
Currently, any user viewing an RFI can answer it as long as the status is "OPEN". The answer form should only be shown to users who belong to the organization that the RFI is assigned to (`assigned_to_org_id`).

## Change

**File: `src/components/rfi/RFIDetailDialog.tsx`** (line 38)

Update the `canAnswer` logic to also check that the current user's organization matches the RFI's `assigned_to_org_id`:

```typescript
// Before:
const canAnswer = rfi.status === 'OPEN';

// After:
const canAnswer = rfi.status === 'OPEN' && currentOrgId === rfi.assigned_to_org_id;
```

This is a single-line change. The `currentOrgId` prop is already passed into this component and `rfi.assigned_to_org_id` is already available on the RFI object. No other files need changes.

## Technical Details
- `currentOrgId` comes from `useAuth().userOrgRoles[0]?.organization?.id` in the parent `RFIsTab` component
- `assigned_to_org_id` is set during RFI creation via the routing step wizard
- Users not in the assigned org will see "Awaiting response" instead of the answer form
- Closing an RFI (status ANSWERED -> CLOSED) remains available to all team members since that is a separate action

