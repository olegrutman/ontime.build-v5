

# Make Sidebar Always Visible During Wizards

## Problem
When any wizard/dialog opens (PO Wizard, Estimate Upload, etc.), the Radix Dialog overlay (`fixed inset-0 z-50 bg-black/80`) covers the entire viewport, hiding the project sidebar behind it.

## Root Cause
- `ProjectSidebar` uses flow layout (`min-h-[calc(100vh-52px)]`), not fixed positioning
- Dialog overlay uses `fixed inset-0`, covering everything
- Dialog content centers on the full viewport, ignoring sidebar

## Approach
Two changes make the sidebar persist through dialogs:

### 1. Make `ProjectSidebar` fixed-positioned (like `DashboardSidebar` already is)
- Change from flow layout to `fixed left-0 top-[52px] bottom-0` with the same width
- Add `lg:ml-[200px] xl:ml-[220px]` to the main content wrapper in `ProjectHome.tsx` so content shifts right
- This matches the `DashboardSidebar` pattern already used in `AppShell`

### 2. Offset dialog overlay and content on desktop
- In `dialog.tsx`, shift the overlay: add `lg:left-[200px] xl:left-[220px]` instead of `left-0`
- Shift dialog content centering to account for sidebar width: use CSS `calc()` so the dialog centers in the remaining space

### Files to edit
- `src/components/project/ProjectSidebar.tsx` — change to fixed positioning with `z-40` (same as `DashboardSidebar`)
- `src/pages/ProjectHome.tsx` — add left margin on `lg:` to offset for the now-fixed sidebar
- `src/components/ui/dialog.tsx` — offset overlay and content left edge on `lg:` breakpoints

### Technical detail
The `DashboardSidebar` is already fixed at `z-40`. The dialog is at `z-50`. By shifting the dialog overlay's `left` to match the sidebar width on `lg:` screens, the sidebar remains visible underneath. The dialog content re-centers within the visible area using `left: calc(50% + 100px)` on `lg:` / `calc(50% + 110px)` on `xl:`.

