

# Make Data Manager Full Width

## Problem
The Data Manager is inside a `max-w-3xl` container (768px), cramming wide tables into a narrow column. The settings cards above it are fine at that width, but data tables need the full page width.

## Changes

### `src/pages/platform/PlatformSetup.tsx`
Move `<PlatformDataManager />` **outside** the `max-w-3xl` wrapper so it stretches to the full content area width.

```
Before:
<div className="space-y-6 max-w-3xl">
  {/* General card */}
  {/* Defaults card */}
  {/* Branding card */}
  <PlatformDataManager />    ← trapped in narrow container
</div>

After:
<div className="space-y-6">
  <div className="max-w-3xl space-y-6">
    {/* General card */}
    {/* Defaults card */}
    {/* Branding card */}
  </div>
  <PlatformDataManager />    ← full width
</div>
```

### `src/components/platform/data-tables/DataTableShell.tsx`
Remove the `min-w-[900px]` on the table — with full width available, the table should use natural column sizing and only scroll if truly needed on smaller screens.

| File | Change |
|------|--------|
| `PlatformSetup.tsx` | Restructure wrapper so Data Manager is outside `max-w-3xl` |
| `DataTableShell.tsx` | Remove forced `min-w-[900px]`, keep `overflow-x-auto` as fallback |

