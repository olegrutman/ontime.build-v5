
# Add "My Team" Access for Supplier Role

## Problem
Currently, the SUPPLIER role has `canManageOrg: false` in its default permissions. This means only supplier admins (who get all permissions) can see the "My Team" page. Non-admin supplier team members cannot access it.

## Change

**File: `src/types/organization.ts`** (1 line change)

Update the SUPPLIER role defaults to set `canManageOrg: true`:

```
SUPPLIER: {
  ...
  canManageOrg: true,   // was false
  ...
}
```

This ensures all supplier team members can see and access the "My Team" page in both the sidebar and the mobile bottom navigation, matching how GC, TC, and FC roles already work.

## What This Affects
- Sidebar: "My Team" link appears for all supplier users (not just admins)
- Mobile bottom nav: "My Team" tab appears in the dashboard items for supplier users
- The OrgTeam page itself already handles admin-vs-member permissions internally (only admins can invite, change roles, etc.), so non-admin suppliers will see the team list but won't have admin controls
