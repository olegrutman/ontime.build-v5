

# Plan: Enhance Ontime.Build with Monday.com-Style Design Patterns

## Overview
This plan enhances your existing GC/TC/FC/Supplier organizational model with Monday.com-inspired visual design, permission patterns, and multi-company collaboration features while preserving your current architecture.

---

## Current State Analysis

### What You Have (Strengths to Keep)
- Solid organizational hierarchy: GC -> TC -> FC -> Supplier
- Role-based permission system (`ROLE_PERMISSIONS` in `types/organization.ts`)
- Project-centric navigation with tabs (Overview, SOV, Work Orders, Invoices)
- Dark sidebar with collapsible groups
- State badges with color coding

### Gaps vs Monday.com
- **Visual**: Static status badges vs Monday's colorful, interactive status columns
- **Board View**: No kanban/board layouts for work items
- **Hover Actions**: Most actions require explicit menus vs hover-reveal
- **Permissions UI**: Role permissions are code-only, not visualized
- **Guest Access**: No concept of limited "viewer" or "guest" roles within a project

---

## Phase 1: Visual Design Enhancements

### 1.1 Status Columns (Monday-Style)
Replace static badges with interactive, colorful status indicators.

**New Component**: `src/components/ui/status-column.tsx`

| Feature | Description |
|---------|-------------|
| Color Picker | Click status to open color palette |
| Inline Labels | Editable status text |
| Pulse Animation | New updates show a subtle pulse |
| Progress Mode | Status can show % complete |

**Color Palette** (Monday-inspired):
```
--monday-green: #00C875
--monday-yellow: #FDAB3D
--monday-red: #E2445C
--monday-blue: #0086C0
--monday-purple: #A25DDC
--monday-gray: #C4C4C4
```

### 1.2 Board View Components

**New Component**: `src/components/board/BoardColumn.tsx`
- Vertical column with status header
- Drag-and-drop items between columns
- Collapse/expand functionality
- Item count badge

**New Component**: `src/components/board/BoardItem.tsx`
- Condensed card for board view
- Shows title, assignee avatar, due date
- Hover reveals quick actions

### 1.3 Hover-Activated Actions

**Pattern**: Show action buttons only on hover

```tsx
// Before (current)
<DropdownMenu>
  <DropdownMenuTrigger>
    <MoreVertical />
  </DropdownMenuTrigger>
</DropdownMenu>

// After (Monday-style)
<div className="group">
  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
    <Button size="icon" variant="ghost">
      <Edit className="h-4 w-4" />
    </Button>
    <Button size="icon" variant="ghost">
      <Copy className="h-4 w-4" />
    </Button>
  </div>
</div>
```

**Files to Update**:
- `ProjectRow.tsx` - Add hover actions
- `WorkItemCard.tsx` - Add hover actions
- `InvoiceCard.tsx` - Add hover actions

---

## Phase 2: Permission Model Visualization

### 2.1 Permission Matrix UI

**New Page**: `src/pages/RolePermissions.tsx`

Display a visual matrix showing what each role can do:

```
              | GC_PM | TC_PM | FC_PM | FS | SUPPLIER
View Rates    |   x   |   x   |       |    |
Approve Work  |   x   |       |       |    |
View Invoices |   x   |   x   |   x   |    |
Add Hours     |   x   |   x   |   x   | x  |
Invite Members|   x   |   x   |       |    |
```

### 2.2 Role Badges in UI

**New Component**: `src/components/ui/role-badge.tsx`

Show user's role with organization type color:
- GC: Blue badge
- TC: Green badge  
- FC: Purple badge
- Supplier: Amber badge

Display throughout the app:
- Project team list
- Activity feed
- Invoice creators

### 2.3 Permission-Aware Components

Create a higher-order component for permission-based rendering:

**New Utility**: `src/components/auth/RequirePermission.tsx`

```tsx
<RequirePermission permission="canApprove">
  <Button>Approve Work Order</Button>
</RequirePermission>
```

---

## Phase 3: Multi-Company Collaboration

### 3.1 Project Access Levels

Enhance `project_team` with granular access levels (like Monday's board permissions):

| Level | Description |
|-------|-------------|
| Owner | Full control, can delete project |
| Admin | Manage team, settings, all actions |
| Editor | Create/edit work items, invoices |
| Viewer | Read-only access to project |

**Database Migration**:
```sql
ALTER TABLE project_team 
ADD COLUMN access_level TEXT DEFAULT 'Editor' 
CHECK (access_level IN ('Owner', 'Admin', 'Editor', 'Viewer'));
```

### 3.2 Guest/External User Support

Allow inviting external users with limited access:

**New Table**: `project_guests`
```sql
CREATE TABLE project_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_level TEXT DEFAULT 'Viewer',
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
```

### 3.3 Organization Relationship Visualization

**Enhanced Component**: `src/components/project/ProjectRelationships.tsx`

Visual hierarchy showing:
```
GC (Acme Construction)
  └─ TC (Smith Electrical) [Contract: $150K]
       └─ FC (Jones Crew) [Contract: $45K]
       └─ Supplier (ABC Supply)
```

### 3.4 Cross-Organization Activity Feed

Show activity from all project participants with proper privacy:

| Actor Role | Can See |
|------------|---------|
| GC | All activity (no rates from TC/FC) |
| TC | Own + FC activity (no GC internal notes) |
| FC | Only own activity |

---

## Phase 4: Board/Table View Toggle

### 4.1 View Switcher Component

**New Component**: `src/components/ui/view-switcher.tsx`

Toggle between:
- List View (current default)
- Board View (kanban-style)
- Table View (spreadsheet-style)

### 4.2 Work Orders Board View

**New Component**: `src/components/project/WorkOrdersBoard.tsx`

Columns based on status:
- Draft
- Ready for Review
- Approved
- In Progress
- Completed

Drag work orders between columns to update status.

### 4.3 Invoices Table View

**New Component**: `src/components/invoices/InvoicesTable.tsx`

Spreadsheet-style with:
- Sortable columns
- Inline editing
- Multi-select for bulk actions
- Export to CSV

---

## Implementation Priority

| Phase | Effort | Impact | Priority |
|-------|--------|--------|----------|
| 1.1 Status Columns | Medium | High | 1 |
| 1.3 Hover Actions | Low | Medium | 2 |
| 2.3 Permission Components | Low | High | 3 |
| 3.3 Relationship Visualization | Medium | Medium | 4 |
| 4.1-4.3 View Modes | High | High | 5 |
| 3.1-3.2 Access Levels | High | Medium | 6 |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/status-column.tsx` | Interactive status picker |
| `src/components/ui/role-badge.tsx` | Organization role indicator |
| `src/components/ui/view-switcher.tsx` | List/Board/Table toggle |
| `src/components/auth/RequirePermission.tsx` | Permission-based rendering |
| `src/components/board/BoardColumn.tsx` | Kanban column |
| `src/components/board/BoardItem.tsx` | Kanban item card |
| `src/components/project/WorkOrdersBoard.tsx` | Board view for work orders |
| `src/components/invoices/InvoicesTable.tsx` | Table view for invoices |

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Add Monday.com color palette |
| `src/components/dashboard/ProjectRow.tsx` | Add hover actions |
| `src/components/project/ProjectTeamSection.tsx` | Add access level selector |
| `src/components/project/ProjectRelationships.tsx` | Enhanced hierarchy visualization |
| `src/components/project/WorkOrdersTab.tsx` | Add view mode toggle |

## Database Migrations

| Migration | Purpose |
|-----------|---------|
| Add `access_level` to `project_team` | Granular project permissions |
| Create `project_guests` table | External viewer support |
| Add `view_preference` to `profiles` | Remember user's preferred view mode |

---

## Visual Reference

### Monday.com Status Column Behavior
1. Click on status cell opens color dropdown
2. Status colors are project-customizable
3. Labels are editable inline
4. Changing status triggers animations

### Permission Inheritance Flow
```
User logs in
  ├─ Check user_org_roles -> Get AppRole (GC_PM, TC_PM, etc.)
  ├─ Check project_team -> Get access_level (Owner, Admin, Editor, Viewer)
  └─ Combine for final permissions
```

This layered approach means:
- A TC_PM with "Viewer" access on a project cannot edit that project
- A GC_PM with "Editor" access has full edit rights via role permissions

