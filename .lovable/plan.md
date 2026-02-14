
# Fix Sasha AI Bubble Overlapping Bottom Nav on Mobile

The Sasha floating bubble is positioned `bottom-4` (16px from bottom), but the BottomNav is 64px tall (`h-16`) and only visible below `lg`. This causes the bubble to sit behind the nav bar on mobile/tablet.

## What Changes

### 1. Move bubble above BottomNav on mobile

In `src/components/sasha/SashaBubble.tsx`, change the bubble button's class from `bottom-4` to `bottom-20 lg:bottom-4` so it sits above the 64px bottom nav on mobile/tablet, and returns to its normal position on desktop where there is no bottom nav.

### 2. Adjust chat panel position

The chat panel currently uses `bottom-20`. On mobile it needs to account for the raised bubble position, so change to `bottom-36 lg:bottom-20` to keep the panel above the bubble.

## Files Modified

| File | Change |
|------|--------|
| `src/components/sasha/SashaBubble.tsx` | Update bubble position to `bottom-20 lg:bottom-4`; update chat panel position to `bottom-36 lg:bottom-20` |

## What Is NOT Changed
- Desktop layout unchanged (bubble stays at bottom-right corner)
- Chat panel sizing, content, and behavior unchanged
- No database or logic changes
