

# Fix: Show Project Sidebar on Change Order Detail Page

## Problem
The CO detail page (`/project/:id/change-orders/:coId`) renders `CODetailLayout` directly without any project shell or sidebar wrapper. It's a completely standalone page, unlike the main project pages which are wrapped in `ProjectShell` + `ProjectSidebar`.

## Approach
Wrap the CO detail page in the same `ProjectShell` + `ProjectSidebar` layout used by `ProjectHome.tsx`. This requires:

### 1. Update `src/pages/CODetail.tsx`
- Import `ProjectShell`, `ProjectSidebar`, `ProjectBottomNav`
- Fetch the project name/status (already fetching `contract_mode`, just expand the select)
- Wrap `CODetailLayout` in the same shell structure as `ProjectHome`:
  - `ProjectShell` provides the top context bar
  - `ProjectSidebar` provides the fixed left nav
  - Main content area gets the `lg:ml-[200px] xl:ml-[220px]` offset

### 2. Update `src/components/change-orders/CODetailLayout.tsx`
- Remove or simplify the standalone sticky header (line 203) since `ProjectShell` now provides the top bar
- Keep the back arrow but make it navigate to the CO list within the project, not replace the entire header
- The `min-h-screen` on the outer div should become `min-h-0 flex-1` since it's now inside the shell

### Files to edit
- `src/pages/CODetail.tsx` — wrap in `ProjectShell` + `ProjectSidebar`
- `src/components/change-orders/CODetailLayout.tsx` — remove duplicate top bar, adjust outer container to fit inside shell layout

