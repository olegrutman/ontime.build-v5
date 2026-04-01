# CO Detail: Full-Page on Desktop

## What I Understand

Right now, when you click a CO card on desktop, it opens as a **slide-over panel** (a drawer sliding in from the right). You want it to feel like opening a full project — the same way clicking into a project gives you a full-page overview with its own navigation, hero section, and content areas. The CO should feel like a "mini project" — not a side panel you peek at.

Think of it like this: the Project Overview page has its own header, hero card, tabs, and content. The CO detail should have that same weight and presence — full screen, its own topbar with a back button, and all the sections laid out with room to breathe.

## What Changes

### 1. Desktop clicks navigate to full page (not slide-over)
**File: `src/components/change-orders/COListPage.tsx`**
- Remove the slide-over logic entirely (the `selectedCoId` state and `COSlideOver` render)
- On card click, **always** navigate to `/project/{id}/change-orders/{coId}` — same as mobile already does
- This means clicking a CO card takes you to a dedicated full page, just like clicking a project takes you to its overview

### 2. Remove the slide-over wrapper
**File: `src/components/change-orders/COSlideOver.tsx`**
- No longer needed. The full-page route (`CODetail.tsx`) already renders `CODetailLayout` directly

### 3. Clean up CODetailLayout
**File: `src/components/change-orders/CODetailLayout.tsx`**
- Remove the `isSlideOver` prop and any conditional styling based on it
- The layout is always full-page now — uses the full viewport width with `max-w-6xl` centered content
- The topbar, hero block, two-column layout, and sticky footer all render naturally as a full page

## Result
Clicking any CO card on any device navigates to a full-page CO detail that looks and feels like a project overview — same visual weight, same layout patterns, same "I'm inside something important" feeling. No more peek-in drawers.

## Files
| File | Change |
|------|--------|
| `src/components/change-orders/COListPage.tsx` | Remove slide-over, always navigate to full page |
| `src/components/change-orders/CODetailLayout.tsx` | Remove `isSlideOver` prop/logic |
| `src/components/change-orders/COSlideOver.tsx` | Can be deleted (no longer used) |
