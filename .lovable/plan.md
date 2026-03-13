

# Add Prominent Invite Panel to FC Dashboard

## Problem
Field Crew (FC) organizations use the regular dashboard, which only shows pending project invites in the small "Needs Attention" card in the right column. Unlike the Supplier dashboard (which was recently fixed), there's no prominent `PendingInvitesPanel` for FC users to easily accept/decline project invites.

## Solution
Add the `PendingInvitesPanel` to the regular dashboard, shown prominently right after `OrgInviteBanner` when there are pending invites. This benefits FC orgs (who are invite-only and never create projects) and also any other org type with pending invites.

## Change

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Import `PendingInvitesPanel` and render it after `OrgInviteBanner` when `pendingInvites.length > 0` |

### Detail
After `<OrgInviteBanner />` (line 209), add:
```tsx
{pendingInvites.length > 0 && (
  <PendingInvitesPanel invites={pendingInvites} onRefresh={refetch} />
)}
```

This reuses the same `PendingInvitesPanel` component already used on the Supplier dashboard, giving FC users (and all other org types) a prominent, full-width invite card with Accept/Decline buttons at the top of their dashboard.

