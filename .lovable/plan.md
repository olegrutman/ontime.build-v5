

# Fix: Sasha Chat Panel Covers Entire Screen on Mobile

## The Problem

On mobile, the Sasha chat panel uses `left-2 right-2` positioning with `max-h-[60vh]`, which makes it span nearly the full screen width and a large portion of the height. Combined with the `bottom-36` positioning (to sit above mobile bottom nav), it effectively blocks most of the page content — users can't interact with cards or other elements behind it.

## The Fix

Make the mobile chat panel smaller and more contained so users can still see and tap content behind it:

### File: `src/components/sasha/SashaBubble.tsx` (line 271)

1. **Reduce mobile height**: Change `max-h-[60vh]` to `max-h-[45vh]` on mobile (keep `sm:max-h-[min(500px,70vh)]` for larger screens)
2. **Constrain mobile width**: Instead of `left-2 right-2` (full width), use `right-2 left-auto w-[calc(100vw-1rem)]` on xs, but cap it at ~320px on small phones so it doesn't span edge-to-edge. Alternatively, use `left-4 right-4 sm:left-auto` for slight margins.
3. **Add a minimize/collapse option**: Add a small minimize button in the header that collapses the panel to just the header bar, letting users peek at the page without fully closing Sasha.

**Simplified approach** — just adjust the CSS classes on the chat panel div:

```
Current:  bottom-36 lg:bottom-20 right-2 left-2 sm:left-auto sm:right-4 sm:w-[min(400px,calc(100vw-2rem))] max-h-[60vh] sm:max-h-[min(500px,70vh)]
New:      bottom-36 lg:bottom-20 right-2 left-auto w-[min(300px,calc(100vw-5rem))] sm:w-[min(400px,calc(100vw-2rem))] max-h-[45vh] sm:max-h-[min(500px,70vh)]
```

Key changes:
- **Mobile width**: `left-auto` + `w-[min(300px,calc(100vw-5rem))]` — panel no longer stretches edge-to-edge; stays anchored to the right with a max of 300px
- **Mobile height**: `max-h-[45vh]` — shorter panel leaves more visible page area
- Both expand back to current sizes on `sm:` breakpoint

### Single file change: `src/components/sasha/SashaBubble.tsx`

