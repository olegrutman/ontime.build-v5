
# Plan: Enable Scrolling for Long Lists in Product Picker

## Problem

When the list of categories or secondary categories is longer than the visible area, users cannot scroll to see all items. This affects `CategoryGrid` and `SecondaryCategoryList` components.

## Root Cause

The parent `ProductPicker` has proper scroll setup (`<div className="flex-1 overflow-y-auto">`), but the child components don't fill the container height properly:

| Component | Current Structure | Issue |
|-----------|------------------|-------|
| `CategoryGrid` | `<div className="grid ... p-4">` | No height constraints, doesn't fill parent |
| `SecondaryCategoryList` | `<div className="p-4 space-y-2">` | No height constraints, doesn't fill parent |
| `ProductList` | `<div className="flex flex-col h-full">` with `flex-1 overflow-y-auto` | Correct |
| `StepByStepFilter` | `<div className="flex flex-col h-full">` with `flex-1 overflow-y-auto` | Correct |

Since the parent already has `overflow-y-auto`, the child components just need to not interfere with that scrolling.

## Solution

The simplest fix is to ensure the child content flows naturally within the scrollable parent. The current structure should work because `overflow-y-auto` on the parent container should scroll all content inside it.

However, looking more closely at the nesting:

```
ProductPicker content wrapper: flex flex-col h-full
├── Header: fixed height
└── Content area: flex-1 overflow-y-auto  ← This should scroll
    └── CategoryGrid/SecondaryCategoryList  ← These just need proper content
```

The issue is likely that the child components are rendering their own internal scroll containers OR the grid layout is causing height calculation issues.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/po-wizard-v2/CategoryGrid.tsx` | Wrap content in proper scroll container |
| `src/components/po-wizard-v2/SecondaryCategoryList.tsx` | Wrap content in proper scroll container |

---

## Technical Changes

### 1. `src/components/po-wizard-v2/CategoryGrid.tsx`

**Current** (line 29-43):
```typescript
return (
  <div className="grid grid-cols-2 gap-3 p-4">
    {categories.map(category => (
      // ... buttons
    ))}
  </div>
);
```

**Updated**:
```typescript
return (
  <div className="h-full overflow-y-auto">
    <div className="grid grid-cols-2 gap-3 p-4">
      {categories.map(category => (
        // ... buttons
      ))}
    </div>
  </div>
);
```

Also update the loading state (lines 12-18) with the same wrapper.

### 2. `src/components/po-wizard-v2/SecondaryCategoryList.tsx`

**Current** (line 30-53):
```typescript
return (
  <div className="p-4 space-y-2">
    {categories.map(category => (
      // ... buttons
    ))}
  </div>
);
```

**Updated**:
```typescript
return (
  <div className="h-full overflow-y-auto">
    <div className="p-4 space-y-2">
      {categories.map(category => (
        // ... buttons
      ))}
    </div>
  </div>
);
```

Also update the loading state (lines 12-19) and empty state (lines 22-27) with the same wrapper.

---

## Summary

Add `h-full overflow-y-auto` wrapper to `CategoryGrid` and `SecondaryCategoryList` to ensure they properly fill the scrollable parent container and allow scrolling when content exceeds the viewport.
