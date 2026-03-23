

# Make Project Rows More Visually Clickable on Dashboard

## Problem
The project rows in `DashboardProjectList` are flat divs with only a subtle `hover:bg-accent/50` — they don't look like clickable items. Users may not realize they can click to open a project.

## Changes

**File: `src/components/dashboard/DashboardProjectList.tsx`** — Lines 164-259

Make each project row more obviously interactive:

1. **Add a right chevron** (`ChevronRight` icon) at the end of each row — the universal "tap to go" indicator. Visible on mobile always, desktop on hover.

2. **Add a left border accent** on hover — a 3px primary-colored left border that appears on hover to create a "selected" feel.

3. **Slightly elevate on hover** — add a subtle shadow or background shift so it feels like a button.

4. **Increase row padding slightly** and add rounded corners per row to make each one feel like a discrete tappable card.

Updated row classes:
```tsx
<div
  className="px-4 py-3.5 hover:bg-accent/60 hover:border-l-[3px] hover:border-l-primary 
             transition-all cursor-pointer flex items-center gap-3 group"
  style={{ minHeight: '56px' }}
  onClick={() => navigate(`/project/${project.id}`)}
>
  {/* ... existing content ... */}
  
  {/* Add chevron at end, before the menu */}
  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
</div>
```

5. **Import `ChevronRight`** from lucide-react (not currently imported in this file).

| File | Change |
|------|--------|
| `src/components/dashboard/DashboardProjectList.tsx` | Add chevron icon, hover border accent, and improved hover styling to project rows |

