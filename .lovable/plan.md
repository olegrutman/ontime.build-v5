
# Plan: Fix Product Picker Scrolling on Desktop

## Problem

The Product Picker has **nested scroll containers** that conflict with each other. The parent container in `ProductPicker.tsx` (line 378) has `overflow-y-auto`, and several child components also have their own `overflow-y-auto` containers. This creates competing scroll contexts where neither works properly.

### Current Structure (Problematic)

```text
ProductPicker content wrapper
├── Header (fixed)
└── Content area: flex-1 overflow-y-auto  ← SCROLL 1
    └── ProductList: flex flex-col h-full
        ├── Search bar (fixed)
        └── Products: flex-1 overflow-y-auto  ← SCROLL 2 (conflicts!)
```

The conflict arises because:
- Parent has `overflow-y-auto` but contains a child with `h-full`
- Child also has `overflow-y-auto` creating nested scroll
- Browser cannot determine which container should scroll

## Solution

**Simplify to single scroll context:** Remove scroll handling from parent and let each child component manage its own scrolling internally.

### Updated Structure

```text
ProductPicker content wrapper
├── Header (fixed)
└── Content area: flex-1 min-h-0  ← NO overflow, just sizing
    └── ProductList: h-full flex flex-col
        ├── Search bar (fixed)
        └── Products: flex-1 overflow-y-auto min-h-0  ← SINGLE scroll
```

**Key insight:** Using `min-h-0` on flex children allows them to shrink below their content size, enabling proper overflow behavior.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/po-wizard-v2/ProductPicker.tsx` | Replace `overflow-y-auto` with `min-h-0` on content area |
| `src/components/po-wizard-v2/ProductList.tsx` | Add `min-h-0` to internal scroll container |
| `src/components/po-wizard-v2/CategoryGrid.tsx` | Already has scroll - just verify it works |
| `src/components/po-wizard-v2/SecondaryCategoryList.tsx` | Already has scroll - just verify it works |
| `src/components/po-wizard-v2/StepByStepFilter.tsx` | Add `min-h-0` to ensure proper sizing |
| `src/components/po-wizard-v2/QuantityPanel.tsx` | Already has scroll - just verify it works |

---

## Technical Changes

### 1. `src/components/po-wizard-v2/ProductPicker.tsx`

**Line 378 - Remove overflow from parent, add min-h-0:**

Current:
```typescript
<div className="flex-1 overflow-y-auto">
```

Updated:
```typescript
<div className="flex-1 min-h-0">
```

This lets the parent size correctly without creating a scroll context, allowing children to handle their own scrolling.

### 2. `src/components/po-wizard-v2/ProductList.tsx`

**Line 47 - Add min-h-0 to wrapper:**

Current:
```typescript
<div className="flex flex-col h-full">
```

Updated:
```typescript
<div className="flex flex-col h-full min-h-0">
```

**Line 85 - Add min-h-0 to scroll container:**

Current:
```typescript
<div className="flex-1 overflow-y-auto p-4 space-y-2">
```

Updated:
```typescript
<div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-2">
```

### 3. `src/components/po-wizard-v2/StepByStepFilter.tsx`

**Add min-h-0 to main wrapper (around line 78):**

Current:
```typescript
<div className="flex flex-col h-full">
```

Updated:
```typescript
<div className="flex flex-col h-full min-h-0">
```

**Add min-h-0 to options scroll area:**

Ensure the options container has `min-h-0` alongside its scroll class.

---

## Why This Works

1. **`min-h-0`**: In flexbox, children default to `min-height: auto` which prevents shrinking below content size. Adding `min-h-0` allows flex items to shrink, enabling overflow to work correctly.

2. **Single scroll context**: Each component manages its own scroll independently, avoiding conflicts.

3. **Consistent pattern**: All picker screens use the same structure: outer wrapper with `h-full min-h-0`, inner scroll area with `flex-1 overflow-y-auto min-h-0`.

---

## Testing

After implementation, verify scrolling works on:

| Screen | Expected Behavior |
|--------|-------------------|
| Category Grid | Scroll if more than 8 categories |
| Secondary List | Scroll if more than 6 items |
| Filter Steps | Scroll if many options |
| Product List | Scroll through 40+ products |
| Quantity Panel | Scroll on small screens with notes expanded |
