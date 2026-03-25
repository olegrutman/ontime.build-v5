

# Fix: FC Can See SOV Between GC and TC

## Problem
Field Crew users can currently see Schedule of Values for GC-TC contracts. This violates the visibility rule: "Users see only contracts (and associated SOVs) where their organization is either the from_org_id or to_org_id."

The UI filter on `ProjectSOVPage.tsx` line 516 correctly filters visible contracts, but the underlying RLS policies are too broad. Two policy sets override the contract-scoped policy:
- "Project team can view SOVs" / "Project team can manage SOVs" — allows any accepted team member to see ALL SOVs
- "Project team can view SOV items" / "Project team can manage SOV items" — same for items

Since Postgres RLS policies are OR'd, the broad team policies negate the contract-scoped ones.

Additionally, the `useSOVPage` hook fetches contracts without org filtering, potentially leaking data to the client even if the UI hides it.

## Changes

### 1. Database: Tighten RLS policies

**Drop overly broad policies on `project_sov`:**
- Drop "Project team can view SOVs"
- Drop "Project team can manage SOVs"

**Drop overly broad policies on `project_sov_items`:**
- Drop "Project team can view SOV items"
- Drop "Project team can manage SOV items"

The remaining contract-scoped SELECT policies ("Users can view SOV for their contracts" / "Users can view SOV items for their contracts") already handle read access correctly. The existing "Project members can create/update/delete" policies handle writes (they check project creator or participant org).

**Update write policies** on both tables to also enforce contract-org membership (ensure only the `to_org_id` — the hiring party — can insert/update/delete SOV data for a given contract).

### 2. Code: Filter contracts in `useSOVPage` hook

| File | Change |
|------|--------|
| `src/hooks/useSOVPage.ts` | Add `userOrgId` parameter. Filter `allContracts` query to only return contracts where `from_org_id` or `to_org_id` matches the user's org. This prevents client-side data leakage. |

### Migration SQL (summary)

```sql
-- Drop broad team policies on project_sov
DROP POLICY "Project team can view SOVs" ON project_sov;
DROP POLICY "Project team can manage SOVs" ON project_sov;

-- Drop broad team policies on project_sov_items
DROP POLICY "Project team can view SOV items" ON project_sov_items;
DROP POLICY "Project team can manage SOV items" ON project_sov_items;
```

The remaining policies already enforce contract-scoped access for SELECT and project-member checks for INSERT/UPDATE/DELETE.

