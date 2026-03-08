

# Add Welcome Tooltip for Sasha on First Dashboard Visit

## What Changes

Modify `SashaBubble.tsx` to show a one-time "Need help? Click me!" tooltip when the user first lands on `/dashboard`. This replaces the generic "Ask Sasha" label on that first visit and is persisted via `localStorage` so it only appears once.

## Implementation

### File: `src/components/sasha/SashaBubble.tsx`

1. Add a `welcomeDismissed` state initialized from `localStorage` key `sasha_welcome_seen`
2. On the `/dashboard` route, if `!welcomeDismissed`, show a styled tooltip arrow-pointing bubble saying "Need help? Click me!" instead of the default "Ask Sasha 💬" label
3. When the user clicks the Sasha bubble (or after 8 seconds), mark `sasha_welcome_seen = true` in localStorage and hide the welcome tooltip
4. The existing `showLabel` logic remains unchanged for non-dashboard pages

### Tooltip Design
- Positioned to the left of the bubble (same as current label)
- Slightly larger with a subtle arrow/caret pointing right toward Sasha
- Uses primary colors to stand out
- Animates in with a fade + slight scale

