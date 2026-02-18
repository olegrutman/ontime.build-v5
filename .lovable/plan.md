

# RFI (Request for Information) Module

## Overview

Build a full RFI workflow that lets project team members submit questions, route them to the appropriate party, and track responses -- all integrated with the existing role-based permission system.

## Database Schema

### New Table: `project_rfis`

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | Default `gen_random_uuid()` |
| project_id | uuid (FK -> projects) | Required |
| rfi_number | serial int | Auto-incrementing per project |
| subject | text | Required, short title |
| question | text | Required, detailed question body |
| answer | text | Nullable, filled on response |
| status | text | `OPEN`, `ANSWERED`, `CLOSED` (default `OPEN`) |
| priority | text | `LOW`, `MEDIUM`, `HIGH`, `URGENT` (default `MEDIUM`) |
| submitted_by_org_id | uuid (FK -> organizations) | Org that created the RFI |
| submitted_by_user_id | uuid | User who created it |
| assigned_to_org_id | uuid (FK -> organizations) | Org responsible for answering |
| answered_by_user_id | uuid | Nullable, user who answered |
| answered_at | timestamptz | Nullable |
| due_date | date | Nullable, optional deadline |
| reference_area | text | Nullable, location/drawing reference |
| created_at | timestamptz | Default `now()` |
| updated_at | timestamptz | Default `now()` |

### New Enum: `rfi_status`

Values: `OPEN`, `ANSWERED`, `CLOSED`

### New Enum: `rfi_priority`

Values: `LOW`, `MEDIUM`, `HIGH`, `URGENT`

### RLS Policies

- **SELECT**: Users can see RFIs on projects they have access to (using existing `has_project_access` function)
- **INSERT**: Authenticated users with project access can create RFIs (GC_PM, TC_PM, FC_PM roles -- not FS or SUPPLIER)
- **UPDATE**: Only the assigned org can answer; only the submitting org or GC can close

### Notification Integration

Add `RFI_SUBMITTED` and `RFI_ANSWERED` to the existing `notification_type` enum. A database trigger will create notifications when:
- An RFI is created (notifies the assigned org)
- An RFI is answered (notifies the submitting org)

### Realtime

Enable realtime on `project_rfis` so the list updates live.

## Frontend Components

### 1. New Page: `src/pages/RFIs.tsx`

A standalone RFI list page (similar to ChangeOrders page pattern):
- Project selector dropdown at top
- Status filter tabs: All / Open / Answered / Closed
- RFI cards in a list showing: RFI number, subject, priority badge, status badge, assigned org, due date
- "New RFI" button (visible to GC_PM, TC_PM, FC_PM only)

### 2. New Component: `src/components/rfi/CreateRFIDialog.tsx`

A dialog form for creating an RFI with fields:
- Subject (text input)
- Question (textarea)
- Priority (select: Low/Medium/High/Urgent)
- Assign To (select dropdown of project team orgs)
- Due Date (optional date picker)
- Reference Area (optional text, e.g., "Level 2, Grid B-4")

### 3. New Component: `src/components/rfi/RFIDetailDialog.tsx`

A sheet/dialog showing full RFI details:
- Header with RFI number, subject, priority, status badges
- Question section
- Answer section (editable textarea if user is from assigned org and status is OPEN)
- "Submit Answer" button (for assigned org)
- "Close RFI" button (for submitter org or GC)
- Metadata: submitted by, assigned to, dates

### 4. New Component: `src/components/rfi/RFIStatusBadge.tsx`

Reusable badge component for RFI status (OPEN = blue, ANSWERED = amber, CLOSED = green).

### 5. New Component: `src/components/rfi/RFIPriorityBadge.tsx`

Reusable badge for priority (LOW = gray, MEDIUM = blue, HIGH = orange, URGENT = red).

### 6. New Hook: `src/hooks/useProjectRFIs.ts`

Custom hook that:
- Fetches RFIs for a project with org names joined
- Provides `createRFI`, `answerRFI`, `closeRFI` mutations
- Subscribes to realtime changes

## Navigation Integration

### Sidebar (`AppSidebar.tsx`)

Add "RFIs" nav item under main navigation (visible to GC, TC, FC -- not Supplier):

```text
Navigation
  Dashboard
  Financials
  Reminders
  Partners
  RFIs          <-- new
  My Team
```

### Project Tabs (`ProjectTopBar.tsx` and `ProjectHome.tsx`)

Add an "RFIs" tab on the project page between "Work Orders" and "Estimates" (hidden for suppliers). This tab shows project-scoped RFIs inline without needing the standalone page.

### Bottom Nav (`BottomNav.tsx`)

No change needed -- the project-level bottom nav already has limited slots and RFIs can be accessed via the project tabs on desktop or the standalone page.

### Routing (`App.tsx`)

Add route: `/rfis` -> `RFIs` page

## Permission Integration

- **Creating RFIs**: Gated by a new `canCreateRFIs` permission flag (defaulting to `true` for GC_PM, TC_PM, FC_PM; `false` for FS, SUPPLIER). Uses `RequirePermission` component.
- **Answering RFIs**: Only users from the `assigned_to_org_id` organization can submit an answer.
- **Closing RFIs**: Only the submitter's org or GC org can close an RFI.
- The permission is enforced both in the UI (hiding buttons) and via RLS policies in the database.

### Permission System Updates

Add to `RolePermissions` interface:
- `canCreateRFIs: boolean`

Add to `MemberPermissions` / `member_permissions` table:
- `can_create_rfis: boolean` (default `true`)

Update `ROLE_PERMISSIONS` defaults and `PERMISSION_TO_DB_COLUMN` mapping.

## Files Created

1. `src/pages/RFIs.tsx` -- Standalone RFI list page
2. `src/components/rfi/CreateRFIDialog.tsx` -- Create RFI form dialog
3. `src/components/rfi/RFIDetailDialog.tsx` -- View/answer/close RFI dialog
4. `src/components/rfi/RFIStatusBadge.tsx` -- Status badge component
5. `src/components/rfi/RFIPriorityBadge.tsx` -- Priority badge component
6. `src/components/rfi/RFICard.tsx` -- Card component for list display
7. `src/components/rfi/index.ts` -- Barrel exports
8. `src/hooks/useProjectRFIs.ts` -- Data hook with CRUD + realtime
9. `src/types/rfi.ts` -- TypeScript types

## Files Modified

1. `src/App.tsx` -- Add `/rfis` route
2. `src/components/layout/AppSidebar.tsx` -- Add RFIs nav item
3. `src/components/project/ProjectTopBar.tsx` -- Add RFIs tab
4. `src/pages/ProjectHome.tsx` -- Add RFIs tab content
5. `src/types/organization.ts` -- Add `canCreateRFIs` to `RolePermissions`
6. `src/hooks/useProjectRealtime.ts` -- Subscribe to `project_rfis` changes

## Database Migration (single SQL file)

1. Create `rfi_status` and `rfi_priority` enums
2. Create `project_rfis` table
3. Add `RFI_SUBMITTED` and `RFI_ANSWERED` to `notification_type` enum
4. Add `can_create_rfis` column to `member_permissions`
5. Enable RLS with policies using `has_project_access`
6. Create notification trigger for RFI status changes
7. Create `updated_at` trigger
8. Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.project_rfis`

