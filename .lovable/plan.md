

# Add Material Responsibility & System Catalog Actions to Overview Team Card

## Problem
On desktop, the `OverviewTeamCard` (right column of project overview) is purely read-only — it shows team members and material responsibility status but has **no way to**:
1. Assign or change material responsibility (GC vs TC)
2. Designate a supplier or choose "System Catalog"

These actions only exist in `TeamMembersCard`, which is rendered **only on mobile** (`lg:hidden`). Desktop users have no access to these critical project setup actions from the overview page.

## Plan

### `OverviewTeamCard.tsx` — Add interactive actions
- Add the same auth/permission hooks used in `TeamMembersCard` (`useAuth`, org role detection)
- Fetch the TC↔GC contract to read `material_responsibility` (same query pattern as `TeamMembersCard.fetchContract`)
- Fetch `project_designated_suppliers` to show current supplier status
- Fetch lock status (finalized/delivered POs prevent changes)
- Add **material responsibility selector** (GC / TC buttons) when no responsibility is set or when user clicks "Change"
- Add **"Designate Supplier"** and **"Use System Catalog"** buttons when no supplier is assigned
- Show current supplier with "Change" button when one exists
- Import and render `DesignateSupplierDialog` for the supplier flow
- Add `onResponsibilityChange` and `onTeamChanged` callback props (matching `TeamMembersCard` interface)

### `ProjectOverviewV2.tsx` — Pass callbacks
- Add `onResponsibilityChange` and `onTeamChanged` props to the component
- Pass them through to `OverviewTeamCard`

### `ProjectHome.tsx` — Wire callbacks on desktop
- Pass `setMaterialResponsibility` and `readiness.recalculate` to `ProjectOverviewV2` (same as already done for `TeamMembersCard` on mobile)

## Files Modified
| File | Change |
|------|--------|
| `OverviewTeamCard.tsx` | Add material resp selector, supplier designation, system catalog button |
| `ProjectOverviewV2.tsx` | Pass new callback props through |
| `ProjectHome.tsx` | Wire callbacks to desktop overview |

