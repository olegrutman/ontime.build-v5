

# TC Downstream Management: FC Invites, Contracts, Scope Split, and SOV

## Overview

This is a multi-part feature enabling a Trade Contractor (TC) to manage their downstream relationship with Field Crew (FC) organizations — inviting them, setting contract values, splitting scope, and generating a dedicated SOV for the TC↔FC contract.

## Part 1: Restrict GC↔TC contract editing

**Problem**: Any TC team member can currently edit the GC↔TC contract value, even if the project was created by GC.

**Fix in `src/pages/ProjectContractsPage.tsx`**:
- Check if the current user's org is the project's `organization_id` (creator org)
- If not, make the GC↔TC contract input **read-only** — show the value but disable editing
- Only the project creator's org can modify the primary contract value

**Fix in `src/components/project/ScopeDetailsTab.tsx`**:
- Hide the "Edit" button on Contract Summary card if user is not from the creator org

## Part 2: TC invites FC to project

This already works via `AddTeamMemberDialog` — TC org type can add "Field Crew" role (line 99). No changes needed here.

## Part 3: TC↔FC Contract Value

**File: `src/pages/ProjectContractsPage.tsx`**

Currently the contracts page only shows during the initial project setup wizard chain. TC needs access to this page post-setup to:
- Create a contract with their FC
- The flow should be: TC navigates to Scope & Details → sees FC contract section → enters contract value

**New approach — add FC contract management to `ScopeDetailsTab.tsx`**:
- Add a new "Downstream Contracts" card below the existing Contract Summary card
- Visible only to TC org users
- Shows FC team members with contract value inputs
- Upserts into `project_contracts` with `from_role='Field Crew'`, `to_role='Trade Contractor'`, `from_org_id=FC org`, `to_org_id=TC org`
- Separate from the GC↔TC primary contract

## Part 4: Scope Split (TC↔FC)

**New component: `src/components/project/ScopeSplitCard.tsx`**

TC needs to assign which scope items are handled by FC vs kept by TC. This creates a "scope assignment" layer on top of the existing scope selections.

**Database migration**: Create a `project_scope_assignments` table:
```sql
CREATE TABLE project_scope_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  scope_item_id uuid REFERENCES scope_items(id) NOT NULL,
  assigned_to_org_id uuid REFERENCES organizations(id) NOT NULL,
  assigned_role text NOT NULL CHECK (assigned_role IN ('Trade Contractor', 'Field Crew')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, scope_item_id)
);
ALTER TABLE project_scope_assignments ENABLE ROW LEVEL SECURITY;
```

RLS: Allow read/write for project team members.

**UI**: In the Scope Summary card (visible to TC), add a "Split Scope" button that opens a dialog/page showing all active scope items with a toggle for each: "TC" or "FC". Defaults to all TC. TC can flip items to FC.

## Part 5: TC↔FC SOV Generation

**File: `src/hooks/useSOVPage.ts`**

Currently the SOV page assumes one SOV per project tied to the primary GC↔TC contract. To support a TC↔FC SOV:

- The `prereqs` query needs to accept a `contract_id` parameter to fetch the correct contract
- The SOV page needs a contract selector (or separate route) for TC to choose which contract's SOV to view/generate
- The `generate-sov` edge function needs to filter scope items to only those assigned to FC (from `project_scope_assignments`)

**File: `src/pages/ProjectSOVPage.tsx`**

- Add a contract selector at the top when TC has multiple contracts (GC↔TC and TC↔FC)
- Pass selected `contract_id` to `useSOVPage`
- Generate button creates SOV for the selected contract using only the assigned scope items

**File: `supabase/functions/generate-sov/index.ts`**

- Accept optional `contract_id` parameter
- If provided, fetch the specific contract instead of defaulting to the first one
- Filter scope items by `project_scope_assignments` if assignments exist for the project

## Implementation Order

| Step | Files | Description |
|------|-------|-------------|
| 1 | Migration SQL | Create `project_scope_assignments` table with RLS |
| 2 | `src/pages/ProjectContractsPage.tsx` | Make GC↔TC contract read-only for non-creator TC |
| 3 | `src/components/project/ScopeDetailsTab.tsx` | Hide contract edit for non-creator, add downstream contracts card for TC |
| 4 | `src/components/project/ScopeSplitCard.tsx` (new) | Scope assignment UI for TC to split items between TC and FC |
| 5 | `src/hooks/useSOVPage.ts` | Accept contract_id param, fetch correct contract |
| 6 | `src/pages/ProjectSOVPage.tsx` | Add contract selector for multi-contract TC |
| 7 | `supabase/functions/generate-sov/index.ts` | Support contract_id param, filter scope by assignments |

