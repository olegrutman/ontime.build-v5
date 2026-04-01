

# CO Detail: Full-Page on Desktop

## What I Understand

Right now clicking a CO card on desktop opens a **slide-over panel** (drawer from the right). You want it to be a **full page** — the same weight and presence as a project overview. The CO should feel like navigating into a mini-project, not peeking at a side panel.

## Changes

### 1. `src/components/change-orders/COListPage.tsx`
- Remove `COSlideOver` import and `selectedCoId` state
- `handleCardClick` always navigates to `/project/{id}/change-orders/{coId}` (no more conditional mobile/desktop split)
- Remove the `COSlideOver` render block at bottom of file

### 2. `src/components/change-orders/CODetailLayout.tsx`
- Remove `isSlideOver` prop from interface and destructuring
- Change line 268: replace `isSlideOver ? 'h-full' : 'min-h-screen bg-background'` with just `'min-h-screen bg-background'`

### 3. `src/components/change-orders/COSlideOver.tsx`
- Delete this file (no longer used anywhere)

## Result
Every CO card click (desktop and mobile) navigates to a full-page CO detail that fills the viewport like a project overview.

