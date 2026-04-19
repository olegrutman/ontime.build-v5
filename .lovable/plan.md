

You want the **IMIS company logo** (currently invisible in the dark sidebar footer) to be clearly visible, and you want to **remove the Ontime.build logo from the sidebar** since it already lives in the top `ContextBar`.

## What I see now

In `DashboardSidebar.tsx`:
- **Top of sidebar (lines 47–58)**: Ontime.build logo + wordmark — **redundant** with the one in the top `ContextBar`.
- **Company section (lines 78–93)**: IMIS logo rendered as `<img class="max-h-9 max-w-[140px] object-contain rounded">` directly on the dark navy `bg-[hsl(var(--foreground))]` background. If the logo PNG has dark colors or a transparent background with dark marks, it disappears. There's no contrasting backdrop behind it.

## Plan

### 1. Remove the Ontime.build brand band from the sidebar
Delete the top logo button (lines 47–58). Replace with a small spacer (`pt-3`) so nav items don't slam into the top edge.

### 2. Build a proper "Company" panel with a light backdrop
Restructure the company section (lines 78–93) into a clearly delineated card with:
- **Light surface** behind the logo so any logo (light, dark, or color) reads cleanly:
  - `bg-white rounded-lg p-3 mb-2` — pure white tile, the logo always pops
- **Larger logo zone**: `max-h-12` (48px) instead of `max-h-9` (36px), centered
- **Fallback when no logo**: show org initials in a circle (40px) on the same white tile — keeps consistent visual rhythm
- **Below the tile**: company name + org-type chip stay on the dark navy with current styling
- Section gets a top `border-t border-white/10` and a small `text-[0.65rem] uppercase tracking-wider text-slate-500` eyebrow label `"Company"` so the zone is identifiable

Result:
```
┌────────────────────┐
│ [Dashboard]        │  ← nav
│ [Partners]         │
│ ...                │
├────────────────────┤
│ COMPANY            │  ← eyebrow
│ ┌────────────────┐ │
│ │   [IMIS LOGO]  │ │  ← white tile, logo always visible
│ └────────────────┘ │
│ IMIS, LLC          │
│ TRADE CONTRACTOR   │
└────────────────────┘
```

### 3. Optional polish
- Add subtle `shadow-sm` on the white tile to lift it off the dark surface.
- If `logo_url` is missing, show a `bg-white` tile with org initials in dark navy text (`text-[hsl(var(--foreground))]`) — same footprint, never empty.

## Files to modify
- `src/components/app-shell/DashboardSidebar.tsx` — remove Ontime brand band (top), restructure company section (bottom). ~25 lines changed.

## Files NOT touched
- `ContextBar.tsx` — already has Ontime.build lockup, stays as-is.
- `OntimeLogo.tsx`, profile/sign-out section — unchanged.

## Verification
- Top of sidebar shows nav directly (no Ontime.build lockup duplicating the header).
- IMIS logo appears clearly on a white tile, ~48px tall, centered.
- If a logo is missing, a clean initials tile appears in its place — never a blank empty space.
- "COMPANY" eyebrow + name + type chip remain readable below the tile.
- No layout shift; sidebar still 200/220px wide; profile + sign-out untouched.

