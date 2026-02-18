

# Optimize Dashboard for Mobile

## Problems Identified

1. **Quick Stats cards stack vertically (1 column)** on mobile, consuming ~300px of vertical space for just 3 numbers -- pushes actual project content below the fold
2. **Status tab bar** gets cut off horizontally ("On Hold", "Completed", "Archived" hidden off-screen) with no visual scroll hint
3. **"New Project" button** floats alone in a right-aligned row, wasting vertical space
4. **Top header area** has unused vertical space above the quick stats

## Changes

### 1. `src/components/dashboard/DashboardQuickStats.tsx`
- Change grid from `grid-cols-1 sm:grid-cols-3` to `grid-cols-3` (always 3 columns)
- Make tiles compact on mobile: smaller icon (hide icon container on xs), smaller text, tighter padding
- This turns ~300px of vertical space into a single ~70px row

### 2. `src/components/dashboard/StatusMenu.tsx`
- Add scroll-snap and hide scrollbar styling for a cleaner horizontal scroll
- Reduce horizontal padding on mobile (`px-3` instead of `px-5`) so more tabs fit on screen
- Reduce vertical margin on mobile

### 3. `src/pages/Dashboard.tsx`
- Move the "New Project" button into the TopBar via the existing `showNewButton` / `onNewClick` props (already supported by `AppLayout`) instead of rendering it as a separate row
- Tighten overall `space-y` gap on mobile from `space-y-6` to `space-y-4 sm:space-y-6`

### 4. `src/components/dashboard/ProjectRow.tsx`
- Tighten card padding on mobile (reduce from `p-3` to `p-2.5`)
- Slightly reduce icon size on xs screens

## Technical Details

**DashboardQuickStats** -- the key change:
```
grid-cols-3 gap-2 sm:gap-3
```
Each tile becomes a compact column with smaller font on mobile: `text-lg sm:text-2xl` for the number, icon container shrinks to `p-1.5 sm:p-2.5`.

**StatusMenu** -- add fade hint and compact sizing:
- Add `scrollbar-hide` utility class (or inline `scrollbar-width: none` / `-webkit-scrollbar` override)
- Reduce button padding: `px-3 sm:px-5 py-2 sm:py-2.5`
- Add right-edge gradient fade mask to hint scrollability

**Dashboard page** -- remove standalone button row:
- Pass `showNewButton={canCreateProject}`, `onNewClick={() => navigate('/create-project')}`, `newButtonLabel="New Project"` to `AppLayout`
- Remove the separate `<div className="flex justify-end">` block

