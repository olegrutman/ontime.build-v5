# Sasha Popup Redesign

## Problems in current popup
- Greeting bubble uses a dark muted brown/olive surface that looks broken and low-contrast against the white panel.
- Header icons (cursor, refresh, X) are unlabeled — users can't tell what they do.
- Quick-action chips are flat orange outlines with no icons, hierarchy, or grouping.
- On mobile, the panel anchors `bottom-48 right-2` with a 300px width, leaving the input cramped and the bubble overlapping the bottom nav.
- Floating bubble has no clear "chat with me" affordance once the welcome label dismisses.

## Goals
1. Make it feel friendly and inviting (not a dark debug box).
2. Make every control self-explanatory.
3. Make it obviously interactive — Sasha invites the next tap.
4. First-class mobile layout.

## Changes

### 1. SashaBubble — Header (`SashaBubble.tsx`)
- Soft gradient header (`bg-gradient-to-r from-primary/10 via-background to-background`) with avatar in a ring + a small green "online" dot.
- Replace icon-only buttons with **icon + label** pill buttons that collapse to icon-only under `sm:` for mobile:
  - `MousePointer2` → "Point" (highlight a card)
  - `RotateCcw` → "Reset"
  - `X` → "Close"
- Each button keeps a tooltip via `Tooltip` for hover, but the visible label removes ambiguity.

### 2. Assistant message bubble (`SashaMessage.tsx`)
- Replace `bg-muted` (the dark olive) with `bg-primary/5 border border-primary/15 text-foreground`.
- Add subtle `rounded-2xl` and a small avatar tail.
- User bubble keeps `bg-primary text-primary-foreground` but switches to `rounded-2xl` for consistency.

### 3. Quick action chips (`SashaQuickActions.tsx`)
- Two-tier visual:
  - **Suggested next step** (first action) = filled primary button with arrow icon → looks like a CTA.
  - Remaining actions = soft chips `bg-primary/10 text-primary hover:bg-primary/20 border-0 rounded-full`, each prefixed with a small contextual icon based on a keyword map (`Sparkles`, `Play`, `FileText`, `ShoppingCart`, `HelpCircle`, fallback `MessageCircle`).
- Add a tiny "Try one:" label above the chips so users know they're tappable suggestions.

### 4. Input row
- Larger 44px input with rounded-full styling and inline send button (mic-style) — bigger tap target on mobile.
- Placeholder rotates between examples ("Ask about change orders…", "How do I invite a contractor?") — pick one at mount, no animation lib needed.

### 5. Mobile layout
- Panel:
  - Mobile (`<sm`): full-width sheet anchored to bottom — `inset-x-2 bottom-24 w-auto max-h-[70vh]` so it doesn't overlap the bottom nav (currently `bottom-32` for the bubble).
  - Desktop unchanged width (400px) but raise `max-h` to `min(560px,75vh)`.
- Floating bubble: keep position, but add a permanent small "Sasha" chip beside it on desktop (replacing the auto-dismissing label) and a subtle breathing glow instead of bounce so it doesn't feel like a notification.

### 6. Empty/loading polish
- "Sasha is thinking…" becomes 3 animated dots in a chip matching the new assistant bubble style.

## Files touched
- `src/components/sasha/SashaBubble.tsx` — header, panel sizing, input, bubble label.
- `src/components/sasha/SashaMessage.tsx` — bubble colors/shape, loading dots.
- `src/components/sasha/SashaQuickActions.tsx` — CTA + chips with icons, "Try one" label.

No backend, hook, or routing changes. All colors use existing semantic tokens (`primary`, `background`, `foreground`, `muted-foreground`).
