

# Fix: Make Sasha's Chat Panel Scrollable

## Problem

The Sasha chat panel messages area doesn't scroll when content overflows. Two issues:

1. **Flex layout issue**: The `ScrollArea` has `flex-1` but the parent flex container needs `min-h-0` / `overflow-hidden` on the scrollable child for flex shrinking to work properly in CSS.
2. **Scroll ref target**: The `scrollRef` is attached to the `ScrollArea` root, but `scrollTo()` needs to target the actual scrollable viewport element inside Radix's ScrollArea.

## Changes

### File: `src/components/sasha/SashaBubble.tsx`

1. Add `min-h-0 overflow-hidden` to the `ScrollArea` wrapper so it properly constrains within the flex column
2. Fix the auto-scroll logic to target the Radix viewport element (the actual scrollable child) instead of the root

**ScrollArea change (line 221):**
```
// Before
<ScrollArea className="flex-1 p-4" ref={scrollRef as any}>

// After
<ScrollArea className="flex-1 min-h-0 overflow-hidden p-4" ref={scrollRef as any}>
```

**Scroll-to-bottom fix (around line 50):**
```typescript
// Before
scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });

// After — target the viewport element inside ScrollArea
const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
if (viewport) viewport.scrollTop = viewport.scrollHeight;
```

### Result

Messages will scroll as conversation grows, and new messages will auto-scroll to the bottom.
