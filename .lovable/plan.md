

# Add Dedicated Material Responsibility Card to Project Overview

## Goal
Create a prominent, always-visible card on the project overview page that clearly shows which party (GC or TC) is responsible for materials, replacing the current buried display inside contracts and readiness checklist items.

## What Changes

### 1. New Component: `src/components/project/MaterialResponsibilityCard.tsx`

A dedicated card that:
- Queries `project_contracts` for the contract with `material_responsibility` set
- Displays a prominent Package icon with "Material Responsibility" title
- Shows the responsible party name and role (e.g., "GC - Acme Builders" or "TC - Smith Framing")
- If not yet set and user has permission (GC or TC on the contract), shows GC/TC toggle buttons to set it
- If already set and user has permission, shows a small "Change" button to update it
- Uses a distinct visual style (e.g., blue-left border, Package icon) so it stands out from other cards

**Props**: `projectId: string`

**Data fetched**:
- `project_contracts` where `material_responsibility IS NOT NULL` or where `from_role = 'TC'` (to find the relevant contract even if not yet set)
- Joins org names via `from_org:organizations!from_org_id(name)` and `to_org:organizations!to_org_id(name)`

**Display logic**:
- If `material_responsibility` is set: Show "GC" or "TC" badge with the org name, and a subtle change button
- If not set: Show "Not assigned" with GC/TC selection buttons
- Hidden for FC and Supplier roles (they don't manage this)

### 2. Update: `src/pages/ProjectHome.tsx`

- Import `MaterialResponsibilityCard`
- Place it in the GC/TC overview section, right after the `ProjectReadinessCard` (or after `AttentionBanner` for active projects), before `FinancialSignalBar`
- Only render for non-supplier, non-FC, non-demo users

### Files Changed
| File | Change |
|------|--------|
| `src/components/project/MaterialResponsibilityCard.tsx` | New component |
| `src/pages/ProjectHome.tsx` | Import and render the new card |

