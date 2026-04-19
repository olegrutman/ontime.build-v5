

## Issue

Looking at your screenshot: the dashboard sidebar logo lockup is **28×28px** with `text-[1.05rem]` wordmark — visually it disappears against the dark navy. The "Ontime.build" wordmark is barely 17px tall, the icon is the same size as the nav item icons below it (so it reads as just another menu row), and the whole header has only `pt-4 pb-3` of padding so there's no visual weight distinguishing brand from navigation.

Compare to `LandingHeader.tsx` and `AuthPage.tsx` — those use a larger logo and more breathing room. The dashboard sidebar is the most under-sized treatment in the app.

## Recommendation — pick one

### Option A (recommended): **Bold sidebar header band**
Give the logo its own elevated zone at the top of the sidebar.
- Logo icon: `w-7 h-7` → **`w-10 h-10`** (40px, ~40% larger)
- Wordmark: `text-[1.05rem]` → **`text-[1.35rem]`** (matches LandingHeader)
- Padding: `px-4 pt-4 pb-3` → **`px-4 pt-5 pb-4`** + subtle `border-b border-white/10` so the band visually anchors
- Optional: add a faint amber accent dot or thin amber underline on `.build` to mirror brand
- File: `src/components/app-shell/DashboardSidebar.tsx` lines 50–58

### Option B: **Icon-only, oversized**
For a more iconic, less verbose header:
- Drop the wordmark entirely, scale icon to **`w-12 h-12`** (48px), centered
- Cleaner, but loses the "Ontime.build" reinforcement

### Option C: **Move brand to ContextBar (top strip)**
Put the logo lockup in the fixed top bar (`ContextBar.tsx`) at full size (`w-9 h-9` + `text-[1.25rem]` wordmark), and use the sidebar's top zone purely for primary nav. Most balanced if you want the brand visible across **every** page (not just dashboard pages with the sidebar). Requires editing both `DashboardSidebar.tsx` and `src/components/app-shell/ContextBar.tsx`.

## My pick: **Option A**

Lowest risk, biggest visibility win, no layout reshuffling, no new component. It matches the treatment already used on the public-facing `LandingHeader` (which feels right) and keeps the sidebar self-contained.

## Change (Option A)

In `src/components/app-shell/DashboardSidebar.tsx` lines 50–58, replace the logo button with:

```tsx
<button
  onClick={() => navigate('/dashboard')}
  className="flex items-center gap-2.5 px-4 pt-5 pb-4 border-b border-white/10 hover:opacity-80 transition-opacity"
>
  <OntimeLogo className="w-10 h-10" />
  <span className="font-heading text-[1.35rem] font-extrabold tracking-[-0.3px] text-white leading-none">
    Ontime<span className="text-primary">.build</span>
  </span>
</button>
```

Then on the nav (`<nav>` line 61), bump top padding to clear the new border: `pt-3` → keep as is, the `border-b` already separates them.

## Files modified
- `src/components/app-shell/DashboardSidebar.tsx` — header band only (~9 lines).

## Files NOT touched
- `OntimeLogo.tsx`, `ContextBar.tsx`, `ProjectShell.tsx`, all auth/landing logos.

## Verification
- Sidebar logo icon visibly larger than nav row icons (40px vs 16px).
- Wordmark legible at standard reading distance.
- Subtle border separates brand zone from nav list.
- No layout shift in nav items or company section below.
- 1366×768 and 1920×1080 — sidebar still 200/220px wide, no overflow.

