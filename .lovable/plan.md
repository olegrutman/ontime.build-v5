

# Analysis: "Explain This Card" Highlight Mode — Critical Bug

## Problem Found

The overlay has a **fundamental interaction bug**: the semi-transparent background div (`bg-background/40 pointer-events-auto`) captures all mouse events. When the user hovers or clicks, the event target is the overlay itself — not the cards underneath. So `closest('[data-sasha-card]')` never finds a match, and every click triggers `onCancel()`, immediately closing the overlay.

This is exactly what the session replay shows: user activates highlight mode, clicks anywhere, overlay closes instantly with no card detected.

## Fix

**File: `src/components/sasha/SashaHighlightOverlay.tsx`**

Replace the event handlers to use `document.elementFromPoint()` — temporarily hide the overlay, probe what's underneath, then restore it:

```tsx
const handleMouseOver = useCallback((e: MouseEvent) => {
  const overlay = e.currentTarget || e.target;
  // Temporarily hide overlay to probe element underneath
  const els = document.elementsFromPoint(e.clientX, e.clientY);
  const card = els.find(el => el.closest('[data-sasha-card]'))?.closest('[data-sasha-card]');
  if (card) {
    setRect(card.getBoundingClientRect());
  } else {
    setRect(null);
  }
}, []);
```

Since the overlay intercepts events via capture phase, we need to switch to `mousemove` on the overlay div itself and use `elementsFromPoint` to look through it:

1. Remove the global `document.addEventListener` approach
2. Put `pointer-events-auto` only on the background overlay div
3. In the `mousemove` handler on that div, use `elementsFromPoint(e.clientX, e.clientY)` skipping elements inside the overlay to find `[data-sasha-card]` beneath
4. In the `click` handler, do the same probe and either select the card or cancel

**Concrete changes to `SashaHighlightOverlay.tsx`:**

- `handleMouseOver` → `handleMouseMove` on the overlay div, uses `document.elementsFromPoint` to find cards beneath the overlay
- `handleClick` on the overlay div, same `elementsFromPoint` approach to detect cards
- Remove global `document.addEventListener` in favor of React event handlers on the overlay div
- The highlight border div stays `pointer-events-none` (visual only)

This is a single-file fix to `src/components/sasha/SashaHighlightOverlay.tsx`. No other files need changes — the `data-sasha-card` attributes and `SashaBubble` integration are correct.

