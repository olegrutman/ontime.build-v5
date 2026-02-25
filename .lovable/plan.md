

# Fix: Sasha Chat Panel Scrolling (Take 2)

## Problem

The Sasha chat panel content overflows below the input area instead of scrolling. The previous fix added `min-h-0 overflow-hidden` to the ScrollArea but it's still not constraining properly.

## Root Cause

The outer panel container (`fixed ... flex flex-col max-h-[60vh]`) needs `overflow-hidden` itself to enforce the max-height constraint on its flex children. Without it, the flex children can grow beyond the container's max-height. Additionally, the `p-4` padding on ScrollArea should be on the inner content div instead, so the scroll viewport sizing is correct.

## Changes

### File: `src/components/sasha/SashaBubble.tsx`

1. **Add `overflow-hidden` to the outer panel container** (line 206) to enforce the max-height constraint on flex children:
   ```
   // Before
   <div className="fixed z-50 shadow-xl rounded-2xl border bg-background flex flex-col animate-in ..."

   // After — add overflow-hidden
   <div className="fixed z-50 shadow-xl rounded-2xl border bg-background flex flex-col overflow-hidden animate-in ..."
   ```

2. **Move padding from ScrollArea to inner div** (lines 222-240) so the scroll viewport calculates its height correctly:
   ```
   // Before
   <ScrollArea className="flex-1 min-h-0 overflow-hidden p-4" ref={scrollRef as any}>
     <div className="space-y-3">

   // After
   <ScrollArea className="flex-1 min-h-0 overflow-hidden" ref={scrollRef as any}>
     <div className="space-y-3 p-4">
   ```

These two changes together ensure that:
- The flex container respects its max-height
- The ScrollArea fills available space and scrolls when content overflows
- Padding is on the content, not the scroll container (which can interfere with height calculation)

