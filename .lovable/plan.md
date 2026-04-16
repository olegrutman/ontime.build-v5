

# Show Company Logo on Sidebar + Verify Document Downloads

## Problem
1. **Sidebar**: Neither `DashboardSidebar` nor `ProjectSidebar` displays the organization's logo — they only show text/icons
2. **Documents**: The edge functions already have `logo_url` support in all 5 download functions (invoice, PO, WO, credit memo, project summary). The logo not showing on the invoice screenshot is because the organization doesn't have a `logo_url` set yet (user needs to upload one via Profile page)

## Changes

### 1. `src/components/app-shell/DashboardSidebar.tsx` — Add org logo
- Access `currentOrg?.logo_url` from `userOrgRoles[0]?.organization`
- In the company section (lines 85-93), render the logo if available:
  - Show `<img>` with the logo URL above the org name, max-height 36px, rounded
  - Fall back to current text-only display if no logo

### 2. `src/components/project/ProjectSidebar.tsx` — Add org logo  
- Fetch the current user's org logo via `useAuth()` (already available as `userOrgRoles`)
- Add a company section at the bottom (before Settings) or top showing the org logo
- Same pattern: `<img>` if logo exists, skip if not

### 3. `src/hooks/useAuth.ts` — Verify `logo_url` is fetched
- Check that the organization select query includes `logo_url` in the response. If the `userOrgRoles` query doesn't select `logo_url`, add it.

## No Edge Function Changes
All 5 download functions already have logo support. The user just needs to upload a logo via Profile → Company Logo.

## Files Modified
1. `src/components/app-shell/DashboardSidebar.tsx`
2. `src/components/project/ProjectSidebar.tsx`
3. Possibly `src/hooks/useAuth.ts` if `logo_url` isn't in the org select

