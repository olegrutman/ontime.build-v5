

# Make Sasha Bubble More Prominent & Obviously Interactive

## Current State
The floating bubble is a plain 56px circle with Sasha's avatar — no visual cues that it's clickable or interactive. Easy to mistake for a static decoration.

## Changes (single file: `SashaBubble.tsx`)

### 1. Add a pulsing ring + glow effect
- Wrap the bubble with a colored ring/border that pulses (using a CSS animation or Tailwind `ring` + `animate-pulse`)
- Add a box-shadow glow in the primary color to draw the eye

### 2. Add a tooltip/label
- Show a small floating label next to the bubble: **"Ask Sasha 💬"** that appears on first load and fades after a few seconds, or persists until first click
- Use absolute positioning relative to the bubble

### 3. Add a subtle bounce animation
- Replace or combine with the current `animate-pulse` — a bounce draws more attention than a fade pulse

### 4. Make the bubble slightly larger
- Increase from `h-14 w-14` to `h-16 w-16` for better tap target and visibility

### Summary of visual additions
- Glowing primary-color ring around the avatar
- "Ask Sasha" text label that auto-dismisses after 5 seconds
- Gentle bounce animation on initial load
- Slightly larger size

All changes are in `src/components/sasha/SashaBubble.tsx` with a small CSS keyframe addition in `index.css` if needed (or inline Tailwind).

