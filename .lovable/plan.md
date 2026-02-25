

# Surface the "Designate Supplier Contact" Button

## Problem

The `DesignateSupplierDialog` and the "Designate Supplier Contact" button were built inside `ProjectTeamSection.tsx`, but that component is never rendered on any page. The project overview uses `OperationalSummary.tsx` which has its own compact Team tile -- and that tile has no supplier designation option.

## Fix

Add the "Designate Supplier Contact" button directly into the Team tile inside `OperationalSummary.tsx`, so GC/TC users can see and use it from the project overview.

### File: `src/components/project/OperationalSummary.tsx`

1. Import `DesignateSupplierDialog` and `ROLE_PERMISSIONS` / `OrgType`
2. Add state for `designateDialogOpen` and `designatedSupplier`
3. Fetch designated supplier data alongside team data (query `project_designated_suppliers`)
4. Below the team member list (after line 282), add:
   - If a designated supplier exists: show their name/email and a "Change" button
   - If no supplier is on the team and user is GC/TC with invite permissions: show the "Designate Supplier Contact" button
5. Render `DesignateSupplierDialog` alongside the existing `AddTeamMemberDialog`

### Visual Result

The Team tile on the project Overview will show:

```text
+-----------------------------------+
| TEAM                 (2 active)   |
| * GC  Acme Builders               |
| * TC  Smith Electric               |
|                                    |
| [Designate Supplier Contact]       |
+-----------------------------------+
```

Or if already designated:

```text
| Supplier Contact: John Doe        |
|   Active             [Change]      |
```

### Technical Details

| File | Change |
|------|--------|
| `src/components/project/OperationalSummary.tsx` | Add designated supplier query, button, and dialog integration |

No new files needed -- the `DesignateSupplierDialog` component already exists and works correctly.

