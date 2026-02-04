

# Plan: Simplify Sidebar Navigation and Enhance Partner Directory

## Summary

Streamline the sidebar by removing unused sections and enhance the Partner Directory to show all collaborators from any project, grouped by their role/designation.

---

## What is "Manage Suppliers"?

The **Manage Suppliers** page (`/admin/suppliers`) allows users to:
1. **Create supplier records** - Add suppliers with code, name, and contact info
2. **Upload product catalogs** - Import CSV files to populate a supplier's catalog items (SKU, category, description, UOM)
3. **Delete suppliers** - Remove suppliers and their associated catalog items
4. **View catalog items** - Browse all products for each supplier

Currently restricted to `GC_PM` only, but will be updated to include `TC_PM` as well.

---

## Current Sidebar Structure

```text
Navigation
├── Dashboard
├── Work Items          ← REMOVE
└── SOV Dashboard       ← REMOVE

Materials (collapsible) ← REMOVE ENTIRE SECTION
├── Product Catalog
├── Material Orders
├── Purchase Orders
└── Project Estimates

My Business (Supplier only)
├── My Inventory
└── My Estimates

Approvals (GC_PM only)  ← REMOVE ENTIRE SECTION
├── Estimate Approvals
└── Order Approvals

Admin (collapsible)
├── Partner Directory
└── Manage Suppliers
```

---

## New Sidebar Structure

```text
Navigation
├── Dashboard
└── Partners            ← Promoted from Admin

My Business (Supplier only - unchanged)
├── My Inventory
└── My Estimates

Admin (GC_PM and TC_PM only)
└── Manage Suppliers
```

---

## Technical Changes

### File 1: `src/components/layout/AppSidebar.tsx`

**Changes:**

1. **Remove from `mainNavItems`:**
   - Work Items (`/work-items`)
   - SOV Dashboard (`/sov`)

2. **Add to `mainNavItems`:**
   - Partner Directory (`/partners`) with Handshake icon

3. **Remove entire sections:**
   - `materialsNavItems` array and its collapsible group
   - `approvalNavItems` array and its collapsible group

4. **Update `adminNavItems`:**
   - Keep only "Manage Suppliers"
   - Show for both `GC_PM` AND `TC_PM` roles

**Updated nav arrays:**
```typescript
const mainNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'Partners', url: '/partners', icon: Handshake },
];

const adminNavItems = [
  { title: 'Manage Suppliers', url: '/admin/suppliers', icon: Truck },
];

// Show admin section for GC_PM or TC_PM
{(currentRole === 'GC_PM' || currentRole === 'TC_PM') && (
  <SidebarGroup>
    ...adminNavItems
  </SidebarGroup>
)}
```

---

### File 2: `src/pages/AdminSuppliers.tsx`

**Update access control to allow TC_PM:**

Current (line 46):
```typescript
const isAdmin = currentRole === 'GC_PM';
```

Updated:
```typescript
const isAdmin = currentRole === 'GC_PM' || currentRole === 'TC_PM';
```

Also update the error message (lines 55-60):
```typescript
if (!authLoading && !isAdmin) {
  toast({
    variant: 'destructive',
    title: 'Access Denied',
    description: 'Only GC and TC managers can manage suppliers.',
  });
  navigate('/');
  return;
}
```

---

### File 3: `src/pages/PartnerDirectory.tsx`

**Complete Redesign - Show All Project Collaborators**

Instead of showing "Trusted Partners" from a manual list, show everyone the user has worked with on any project.

**Data Source:**
Query `project_team` table to find all organizations that appear on any project where the current user's organization is also a team member.

**Query Logic:**
```sql
-- Get all orgs from projects where current user's org is a participant
SELECT DISTINCT pt2.org_id, o.name, o.org_code, o.type, COUNT(DISTINCT pt1.project_id) as project_count
FROM project_team pt1
JOIN project_team pt2 ON pt1.project_id = pt2.project_id
JOIN organizations o ON o.id = pt2.org_id
WHERE pt1.org_id = current_user_org_id
  AND pt2.org_id != current_user_org_id
  AND pt2.status = 'active'
GROUP BY pt2.org_id, o.name, o.org_code, o.type
ORDER BY o.type, project_count DESC
```

**New UI Structure:**

```text
┌──────────────────────────────────────────────────────────────┐
│ Partner Directory                                            │
│ Everyone you've worked with on projects                      │
├──────────────────────────────────────────────────────────────┤
│ [Search input: Filter by name or org code...]               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ GENERAL CONTRACTORS (2)                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🏢 ABC Builders           GC123    3 projects together  │ │
│ │ 🏢 Metro Construction     MC456    1 project together   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ TRADE CONTRACTORS (4)                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔧 Elite Framing          EF789    5 projects together  │ │
│ │ 🔧 Pro Plumbing           PP321    2 projects together  │ │
│ │ 🔧 Superior Electric      SE654    2 projects together  │ │
│ │ 🔧 Custom Drywall         CD987    1 project together   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ FIELD CREWS (1)                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 👷 Johnson Crew           JC111    3 projects together  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ SUPPLIERS (3)                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📦 Lumber Depot           LD222    4 projects together  │ │
│ │ 📦 Hardware Supply        HS333    2 projects together  │ │
│ │ 📦 Steel Source           SS444    1 project together   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Grouping Order (by designation):**
1. General Contractors (GC)
2. Trade Contractors (TC)
3. Field Crews (FC)
4. Suppliers (SUPPLIER)

**Each card shows:**
- Organization icon (based on type)
- Organization name
- Org code badge
- Project count (how many projects worked together)

**Remove from current page:**
- Manual "Add Partner" search functionality
- "Trusted Partners" concept
- The `trusted_partners` table dependency

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Remove Work Items, SOV Dashboard, Materials section, Approvals section. Add Partners to main nav. Show Admin for GC_PM + TC_PM. |
| `src/pages/AdminSuppliers.tsx` | Update access control to allow TC_PM in addition to GC_PM |
| `src/pages/PartnerDirectory.tsx` | Complete redesign to show project collaborators grouped by designation |

---

## Role-Specific Sidebar Summary

| Role | Navigation | Admin |
|------|------------|-------|
| **GC_PM** | Dashboard, Partners | Manage Suppliers |
| **TC_PM** | Dashboard, Partners | Manage Suppliers |
| **FC_PM** | Dashboard, Partners | - |
| **FS** | Dashboard, Partners | - |
| **SUPPLIER** | Dashboard, Partners, My Business | - |

---

## Partner Directory Features

- **Automatic Population**: No manual adding required - shows everyone from shared projects
- **Grouped by Role**: General Contractors, Trade Contractors, Field Crews, Suppliers
- **Project Count**: Shows how many projects you've collaborated on together
- **Search/Filter**: Filter partners by name or org code
- **Clean UI**: Consistent card design with role-based icons and colors

