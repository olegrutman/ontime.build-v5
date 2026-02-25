

# Generic Supplier + Designated Supplier User

## What This Does

When a project has no real Supplier company on the team, GC or TC users currently see "No Supplier Assigned" and can't create Purchase Orders. This feature solves that by:

1. **System-wide Generic Supplier**: A built-in supplier record that uses the existing catalog (~1700 items). Any project can use it without needing a real supplier org on the team.
2. **Designated Supplier User**: The GC/TC can assign any user in the system (or invite one by email) to act as the supplier for that project. That person gets full supplier capabilities on the project -- except they cannot edit the product catalog.

## User Flow

```text
Project has no Supplier on team
  -> PO Wizard shows "Generic Supplier (System Catalog)" as an option
  -> GC/TC can create POs using the system catalog

Project Team page
  -> GC/TC clicks "Designate Supplier Contact"
  -> Search for existing user OR invite by email
  -> Designated user gets supplier-level access to this project
  -> They can view estimates, manage POs, respond to RFIs, etc.
  -> They CANNOT edit the product catalog (read-only)
```

## Database Changes

### 1. Add `is_system` flag to `suppliers` table

```sql
ALTER TABLE suppliers ADD COLUMN is_system boolean NOT NULL DEFAULT false;
```

This flags the one system-wide generic supplier. The existing supplier record stays untouched.

### 2. Create the system supplier record

```sql
INSERT INTO suppliers (id, organization_id, supplier_code, name, is_system)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM organizations LIMIT 1), -- placeholder org
  'SYSTEM-CATALOG',
  'Generic Supplier (System Catalog)',
  true
);
```

Wait -- the `suppliers` table requires `organization_id NOT NULL`. We need a system org or make it nullable for system suppliers. Better approach: create a system organization.

Actually, simpler: we'll link the system supplier to the existing supplier's `organization_id` since the catalog items already belong to that supplier. OR we create a dedicated system org. Let me reconsider...

**Revised approach**: Instead of a new supplier record, we use a **convention**: when no project supplier exists, the PO wizard falls back to the first supplier marked `is_system = true`. We'll update the existing supplier (the only one with the 1700-item catalog) to be the system supplier.

### 3. Add `designated_supplier_user_id` to `project_team`

```sql
ALTER TABLE project_team ADD COLUMN designated_supplier_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
```

This lets a GC/TC project team record point to a user who acts as the supplier contact. When this user logs in, if they're the designated supplier on a project, they see that project with supplier-level access.

**Actually, better approach**: Create a new table for clarity:

```sql
CREATE TABLE project_designated_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_email text,
  invited_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'removed')),
  designated_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

ALTER TABLE project_designated_suppliers ENABLE ROW LEVEL SECURITY;

-- Project participants can view
CREATE POLICY "Project participants can view designated suppliers"
ON project_designated_suppliers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_team pt
    WHERE pt.project_id = project_designated_suppliers.project_id
    AND pt.org_id IN (
      SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
    )
  )
  OR user_id = auth.uid()
);

-- GC/TC PMs can manage
CREATE POLICY "PMs can manage designated suppliers"
ON project_designated_suppliers FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_team pt
    JOIN user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE pt.project_id = project_designated_suppliers.project_id
    AND uor.user_id = auth.uid()
    AND pt.role IN ('General Contractor', 'Trade Contractor')
    AND pt.status = 'Accepted'
  )
);
```

## Code Changes

### 1. Migration: Add `is_system` to suppliers + create `project_designated_suppliers` table

Single migration with:
- `is_system` boolean column on `suppliers`
- Update existing supplier to `is_system = true` (it owns the 1700-item catalog)
- New `project_designated_suppliers` table with RLS

### 2. Update PO Wizard supplier loading (`POWizardV2.tsx`)

Currently fetches suppliers only from `project_team` with role `Supplier`. Change to:
- First try project team suppliers (existing logic)
- If none found, fetch the system supplier (`is_system = true`) as fallback
- Display it as "Generic Supplier (System Catalog)" in the header

### 3. Update `HeaderScreen.tsx`

When using the system supplier, show a slightly different card indicating it's the system catalog (no "No Supplier Assigned" error).

### 4. New Component: `DesignateSupplierDialog.tsx`

A dialog accessible from the Project Team section that lets GC/TC:
- Search for any user in the system (using existing `search_existing_team_targets` RPC or profiles search)
- OR enter an email to invite someone
- Saves to `project_designated_suppliers`

### 5. Update Project access logic

When loading a project, check if the current user is a designated supplier. If so, render the supplier view (estimates, POs, RFIs) but with a flag `isDesignatedSupplier = true` that:
- Grants supplier-level project access
- Hides the "My Product Catalog" / inventory editing pages
- Shows in the sidebar as a project they have supplier access to

### 6. Update `ProjectHome.tsx`

Add designated supplier detection alongside the existing `isSupplier` check:
```
const isDesignatedSupplier = check project_designated_suppliers for current user
```
If `isDesignatedSupplier`, render the supplier overview but skip catalog editing.

### 7. Update Dashboard project list

The dashboard fetches projects via `project_team`. For designated suppliers, also query `project_designated_suppliers` to include those projects in the list.

### 8. Guard `SupplierInventory.tsx`

Add check: if user is a designated supplier (not a real SUPPLIER org), block access to the catalog editing page with a message like "You have supplier access to specific projects but cannot edit the product catalog."

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| Migration SQL | Create | Add `is_system` to suppliers, create `project_designated_suppliers` table |
| `src/components/po-wizard-v2/POWizardV2.tsx` | Edit | Fallback to system supplier when no project supplier exists |
| `src/components/po-wizard-v2/HeaderScreen.tsx` | Edit | Show system supplier card instead of error |
| `src/components/project/DesignateSupplierDialog.tsx` | Create | Dialog to search/invite a designated supplier user |
| `src/components/project/ProjectTeamSection.tsx` | Edit | Add "Designate Supplier Contact" button |
| `src/pages/ProjectHome.tsx` | Edit | Detect designated supplier, render supplier view |
| `src/hooks/useDashboardData.ts` | Edit | Include designated supplier projects in dashboard |
| `src/pages/SupplierInventory.tsx` | Edit | Block catalog editing for designated suppliers |
| `src/components/project/index.ts` | Edit | Export new component |

## What the Designated Supplier Can Do

- View project overview (supplier view with estimates vs orders, PO summary, etc.)
- View and respond to RFIs assigned to them
- View Purchase Orders (SUBMITTED and beyond)
- View supplier estimates
- View invoices linked to their POs

## What They Cannot Do

- Edit the product catalog (SupplierInventory page blocked)
- They don't belong to a SUPPLIER organization, so org-level supplier features are not available

