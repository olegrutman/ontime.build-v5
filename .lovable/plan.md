

# Phase 1: Core Ontime.Build Enhancements

## Overview
This phase implements the signup choice flow (New vs Join), the "Join Existing Company" search experience, the Project Readiness Engine with status gating, and dashboard readiness display.

## 1. Signup Flow Redesign

### New first screen: "Are you new or joining?"
Before account creation, show a choice screen with two options:
- "New to Ontime.Build" -- proceeds to the existing Account > Company > Role wizard
- "Joining an existing company" -- goes to a search flow to find and request to join an org

**File: `src/pages/Signup.tsx`**
- Add a new step `-1` (or `'choice'`) as the initial screen
- If "New" is selected, proceed to step 0 (Account creation) as today
- If "Joining" is selected, go to the Join search flow

**New file: `src/components/signup-wizard/ChoiceStep.tsx`**
- Two large cards/buttons: "I'm new" and "I'm joining a company"

### "Joining Existing Company" flow

**New file: `src/components/signup-wizard/JoinSearchStep.tsx`**
Multi-step inline flow:
1. Select State (dropdown of US states)
2. Select Trade (reuse existing TRADES list)
3. Search organization name (text input, queries organizations table filtered by state/trade)
4. Results display: Org Name, Address, Trade, Org Type, Admin Name
5. User selects an org, then proceeds to Account creation (email/password)
6. After account creation, a join request is submitted

### Database changes

**New table: `org_join_requests`**
```sql
CREATE TABLE public.org_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID
);
```

**New column on organizations:** `allow_join_requests BOOLEAN NOT NULL DEFAULT true`

**New RPC: `search_organizations_for_join`** -- searches orgs by state, trade, and name. Returns org details plus admin name. This is a SECURITY DEFINER function accessible to authenticated users.

**New RPC: `approve_join_request`** -- Admin approves a pending request, creating the user_org_role.

**New RPC: `reject_join_request`** -- Admin rejects a pending request.

### OrgTeam page updates
**File: `src/pages/OrgTeam.tsx`**
- Add a "Join Requests" section showing pending requests
- Admin can approve/reject each request
- Add an "Organization Settings" card with the "Allow Join Requests" toggle

### Notification for join requests
- When a join request is created, insert a notification for the org admin

---

## 2. Project Readiness Engine

### Readiness calculation
**New file: `src/hooks/useProjectReadiness.ts`**

A hook that takes a `projectId` and returns:
- `readinessPercent` (0-100)
- `checklist` array of items with `label`, `complete` boolean, and `status` icon

Checklist items (each contributes equal weight):
1. Organization exists (always true if project exists)
2. Contract sum entered (check `project_contracts` for a non-null `contract_sum`)
3. SOV created (check `project_sov` for at least one record)
4. Required team members invited (check `project_participants` count > 1)
5. All required invites accepted (all `project_participants` have `invite_status = 'ACCEPTED'`)
6. Material responsibility selected (check `project_contracts.material_responsibility` is set)
7. Supplier assigned if materials required (if material_responsibility is set, check for SUPPLIER participant)
8. Retainage defined (check `project_contracts.retainage_percent` is not null/0 OR explicitly set)
9. Contract mode selected (check if at least one contract exists with `status = 'Active'`)

### Project status changes
**File: `src/pages/CreateProject.tsx`** and **`src/pages/CreateProjectNew.tsx`**
- New projects default to `status = 'setup'` instead of `'active'`

**Database migration:**
- Update projects table default: `ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'setup';`

### Status transition rules
**File: `src/pages/ProjectHome.tsx`** and **`src/components/dashboard/ProjectRow.tsx`**
- "Set Active" menu option only available when readiness = 100%
- If readiness < 100%, show tooltip: "Complete project setup to activate"

### Block operational record creation
**Files affected:**
- `src/components/change-order-wizard/ChangeOrderWizardDialog.tsx` -- check readiness >= 80% before allowing WO creation
- `src/components/po-wizard-v2/POWizardV2.tsx` -- check readiness >= 80%
- `src/components/invoices/CreateInvoiceDialog.tsx` -- check readiness >= 80%

Show message: "Project setup incomplete. Complete setup before proceeding."

---

## 3. Dashboard Readiness Display

### Project tiles show readiness
**File: `src/components/dashboard/ProjectRow.tsx`**
- Add a small readiness percentage badge or mini progress bar next to each project tile
- Show "Setup (XX%)" for projects in setup state

### Project Overview readiness section
**File: `src/pages/ProjectHome.tsx`**
- Add a readiness banner at the top of the overview tab for projects in 'setup' status
- Display the checklist with check/warning/X icons
- Show progress bar
- "Ready to Execute" or "Setup Incomplete (XX%)"

**New file: `src/components/project/ProjectReadinessCard.tsx`**
- Renders the readiness checklist UI
- Shows progress bar
- Links each incomplete item to the relevant settings/action

### TC special banner
When a TC-created project has no FC participant:
- Show banner: "No Field Crew Assigned" with "+ Add Team Member" button
- Allow editing contract sum, team, supplier, SOV until project becomes ACTIVE

---

## 4. Status badge updates
**File: `src/components/dashboard/ProjectRow.tsx`**
- Add 'setup' to the STATUS_COLORS, STATUS_LABELS, and STATUS_BORDER_COLORS maps

**File: `src/components/dashboard/StatusMenu.tsx`**
- Add 'setup' as a filter option in the status tabs

---

## Technical Details

### Database Migrations (in order)

**Migration 1: org_join_requests and org settings**
```sql
ALTER TABLE organizations ADD COLUMN allow_join_requests BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE public.org_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID
);

ALTER TABLE org_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "Users can view own join requests"
  ON org_join_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Org admins can view requests for their org
CREATE POLICY "Org admins can view join requests"
  ON org_join_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_org_roles
    WHERE user_id = auth.uid()
    AND organization_id = org_join_requests.organization_id
    AND role IN ('GC_PM', 'TC_PM', 'FC_PM')
  ));

-- Authenticated users can create join requests
CREATE POLICY "Users can create join requests"
  ON org_join_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
```

**Migration 2: Project status default**
```sql
ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'setup';
```

**Migration 3: RPC functions**
- `search_organizations_for_join(state, trade, query)` -- SECURITY DEFINER, returns org + admin info
- `approve_join_request(request_id)` -- validates caller is admin, creates user_org_role
- `reject_join_request(request_id)` -- validates caller is admin, updates status

### Files Created
- `src/components/signup-wizard/ChoiceStep.tsx`
- `src/components/signup-wizard/JoinSearchStep.tsx`
- `src/hooks/useProjectReadiness.ts`
- `src/components/project/ProjectReadinessCard.tsx`

### Files Modified
- `src/pages/Signup.tsx` -- add choice step, integrate join flow
- `src/components/signup-wizard/CompanyStep.tsx` -- add trade field to org creation
- `src/components/signup-wizard/types.ts` -- add `signupPath` field
- `src/components/signup-wizard/index.ts` -- export new steps
- `src/pages/OrgTeam.tsx` -- add join requests section and org settings toggle
- `src/hooks/useOrgTeam.ts` -- add join request fetching and approval functions
- `src/pages/ProjectHome.tsx` -- add readiness card for setup projects
- `src/pages/CreateProject.tsx` -- default status to 'setup'
- `src/pages/CreateProjectNew.tsx` -- default status to 'setup'
- `src/components/dashboard/ProjectRow.tsx` -- add readiness display, add 'setup' status
- `src/components/dashboard/StatusMenu.tsx` -- add 'setup' filter
- `src/components/dashboard/DashboardProjectList.tsx` -- pass readiness data
- `src/hooks/useDashboardData.ts` -- include setup status in counts
- `src/components/change-order-wizard/ChangeOrderWizardDialog.tsx` -- readiness gate
- `src/components/po-wizard-v2/POWizardV2.tsx` -- readiness gate
- `src/components/invoices/CreateInvoiceDialog.tsx` -- readiness gate

### What is NOT in Phase 1 (deferred)
- Generate join link
- Search existing Ontime.Build users by name/email/state from Team page
- Organization Settings page (beyond the toggle)
- Updating the Landing page auth section

