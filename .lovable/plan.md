

# Add Alternating Row Shading to Project List

## Change

**File: `src/components/dashboard/DashboardProjectList.tsx`** — Line 165-170

Add alternating background colors to project rows using the `index` from the `.map()` callback. Even rows get a subtle tinted background, odd rows stay default.

```tsx
{filteredProjects.map((project, index) => (
  <div
    key={project.id}
    className={cn(
      "px-4 py-3.5 border-l-[3px] border-l-transparent hover:border-l-primary hover:bg-accent/60 transition-all cursor-pointer flex items-center gap-3 group",
      index % 2 === 0 ? "bg-muted/40" : "bg-card"
    )}
    style={{ minHeight: '56px' }}
    onClick={() => navigate(`/project/${project.id}`)}
  >
```

This gives every other row a light tinted background (`bg-muted/40`) making rows visually distinct and easier to scan — like a spreadsheet with zebra striping.

| File | Change |
|------|--------|
| `src/components/dashboard/DashboardProjectList.tsx` | Add alternating row background colors |

