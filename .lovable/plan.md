

# Fix: Use Company Names & Remove "Downstream" Label

## Problems (from screenshot)
1. Contract cards show **"Unknown"** instead of company names — the org join returns null when org hasn't accepted invite yet (only `invited_org_name` exists in `project_team`)
2. Card title says **"Downstream Contracts & Scope"** — user wants no "downstream" terminology

## Changes

### 1. `src/components/project/ScopeDetailsTab.tsx`
- Fix "Unknown" fallback: when `from_org`/`to_org` name is null, look up the counterparty's `invited_org_name` from `project_team` data (already fetched as `fcTeamOrgs`)
- Also fetch the project's own org name to use as fallback for the current user's side
- Query `project_team` for all team members to get `invited_org_name` as fallback for any contract party

### 2. `src/components/project/DownstreamContractsCard.tsx`
- Rename title from `"Downstream Contracts & Scope"` → `"Contracts & Scope"` (or use the FC company name if only one FC)
- Remove the `DollarSign` icon prefix, keep it clean

### Technical detail
The `Unknown` issue happens because `organizations` table only has rows for orgs that completed signup. Invited-but-not-yet-joined orgs only exist as `invited_org_name` in `project_team`. Fix: join or cross-reference `project_team.invited_org_name` for any org_id that returns null from the organizations join.

