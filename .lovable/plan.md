

# Interactive Demo Orientation with "Bolt" Cartoon Guide

## Overview

Build a complete demo/orientation experience with 4 major parts: demo wizard, demo data context, role-based project views, and an animated Bolt guide. All frontend-only -- no production data touched.

---

## Part 1: Demo Data Layer

### New file: `src/data/demoData.ts`
A static dataset containing 3 sample projects with pre-populated:
- Contracts (stored values only)
- SOV items (4-6 per project)
- 2 Work Orders per project (Draft + Active)
- 1 Purchase Order per project (Draft/Priced)
- 2 Invoices per project
- 3+ urgent notification items per project
- Team members per role

### New file: `src/contexts/DemoContext.tsx`
A React context that:
- Tracks `isDemoMode`, `demoRole` (GC/TC/FC/Supplier), `demoProjectId`
- Provides all demo data via hooks (`useDemoProjects`, `useDemoWorkOrders`, etc.)
- Exposes `enterDemo(role, projectId)` and `exitDemo()` functions
- Never touches Supabase -- purely in-memory

### New file: `src/hooks/useDemoData.ts`
Convenience hooks that read from DemoContext and return data shaped identically to what Supabase queries return, so existing components can consume demo data seamlessly.

---

## Part 2: Landing Page Updates

### Modified: `src/components/landing/HeroSection.tsx`
- Change "Watch demo" button to open a video modal placeholder
- Add "Try Interactive Demo" button that navigates to `/demo`

### New page: `src/pages/Demo.tsx`
3-step wizard:
1. **Choose Role** -- 4 cards: GC, TC, FC, Supplier (with icons and short descriptions)
2. **Choose Sample Project** -- 3 project cards from demo data
3. **Enter Demo** -- Sets demo context and redirects to `/project/:demoId?demo=true`

### Route addition in `src/App.tsx`
- Add `/demo` route pointing to the Demo page

---

## Part 3: Demo-Aware Project Pages

### Modified: `src/pages/ProjectHome.tsx`
- Detect `demo=true` query param or `isDemoMode` from DemoContext
- When in demo mode, read data from DemoContext instead of Supabase
- Show a persistent "Demo Mode" banner at the top with an "Exit Demo" button
- Apply role-based visibility rules using `demoRole` instead of real org roles

### New component: `src/components/demo/DemoBanner.tsx`
- Sticky banner: "You're in demo mode as [Role]. No real data is affected."
- "Exit Demo" button returns to landing page

### New component: `src/components/demo/DemoProjectOverview.tsx`
- Renders the overview tab using demo data
- Shows contracts, SOV existence, Work Orders, Invoices, POs
- Displays "Needs Attention" panel with demo urgent items
- Respects role-based visibility (GC sees everything, FC sees only assigned WOs, etc.)

---

## Part 4: Bolt Guide System

### New assets
- 4-6 Bolt character pose images (SVG/PNG) stored in `src/assets/bolt/`
- Poses: wave, point-right, thumbs-up, thinking, celebrate, hard-hat

### New component: `src/components/bolt/BoltGuide.tsx`
- Floating circular button (bottom-right, above Sasha bubble)
- When open: slide-up panel with:
  - Bolt character image (changes per step)
  - One instruction sentence
  - Back / Next / Skip buttons
  - "Show me why" expandable explanation
- On "Next": navigates to target page/tab and highlights target element

### New component: `src/components/bolt/BoltSpotlight.tsx`
- Full-screen overlay with a cutout around the highlighted element
- Semi-transparent dark backdrop
- Animated border pulse around the target element

### New file: `src/data/boltScripts.ts`
Tour scripts per role (minimum 6 steps each):

**GC Flow:**
1. Overview -- contracts + urgent items (target: attention banner)
2. Work Orders tab (target: WO tab button)
3. Work Order detail -- approval actions (target: first WO card)
4. Purchase Orders tab (target: PO tab button)
5. Invoices tab (target: invoice list)
6. Invite team / next steps (target: team section)

**TC Flow:**
1. Overview financial lanes (target: financial signal bar)
2. Work Orders as mini-projects (target: WO list)
3. PO creation flow (target: "New PO" button)
4. Supplier pricing on PO (target: PO detail pricing)
5. Pricing visibility example (target: pricing column)
6. Wrap-up and next action

**FC Flow:**
1. Overview assigned tasks (target: WO section)
2. Work Order fill-out (target: WO detail form)
3. Photo/notes section (target: notes field)
4. Submit for approval (target: submit button)
5. Invoice creation (target: invoices tab)
6. Wrap-up

**Supplier Flow:**
1. PO list (target: PO tab)
2. PO details (target: first PO card)
3. Enter line pricing (target: pricing inputs)
4. Mark as priced (target: status button)
5. Visibility note (target: info tooltip)
6. Wrap-up

### New hook: `src/hooks/useBoltGuide.ts`
- Manages current step, role, and tour progress
- Provides `nextStep()`, `prevStep()`, `skipTour()`, `getCurrentStep()`
- Persists progress in localStorage
- Integrates with react-router-dom for page navigation

---

## Part 5: Post-Signup Orientation

### Modified: `src/pages/Dashboard.tsx`
- Detect first-time user (no projects, fresh account)
- Show "Take the Tour" card that launches Bolt guide or redirects to `/demo`

---

## File Structure Summary

```text
src/
  assets/bolt/           -- Bolt character SVGs
  components/bolt/
    BoltGuide.tsx         -- Main guide panel + floating button
    BoltSpotlight.tsx     -- Overlay spotlight effect
    index.ts
  components/demo/
    DemoBanner.tsx        -- "Demo Mode" sticky banner
    DemoProjectOverview.tsx -- Overview using demo data
    DemoWizard.tsx        -- Role + project selection wizard
    index.ts
  contexts/
    DemoContext.tsx        -- Demo state management
  data/
    boltScripts.ts        -- Tour step definitions per role
    demoData.ts           -- All demo seed data
  hooks/
    useBoltGuide.ts       -- Tour state management
    useDemoData.ts        -- Demo data access hooks
  pages/
    Demo.tsx              -- Demo wizard page
```

## Implementation Sequence

1. Demo data layer (demoData.ts + DemoContext + hooks)
2. Demo wizard page + route
3. Demo-aware project overview
4. Bolt guide system (scripts, component, spotlight)
5. Landing page CTA updates
6. Dashboard orientation card
7. Responsive polish + testing

## Technical Notes

- All demo data is static TypeScript objects -- zero database interaction
- Bolt character images can use simple SVG illustrations or emoji-style icons as placeholders initially
- The spotlight effect uses CSS `mix-blend-mode` and `clip-path` for the cutout
- Tour navigation uses `react-router-dom`'s `useNavigate` for page transitions
- Demo mode is entirely client-side; exiting demo clears context and returns to landing
- Sasha bubble is hidden during demo mode to avoid overlap with Bolt
- This is a large feature -- recommend building in 3-4 phases (data layer first, then wizard, then Bolt guide)
