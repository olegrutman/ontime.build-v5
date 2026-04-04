

# Redesign Project Shell — Unified Sidebar + Simplified Top Bar

## What I understand you're trying to accomplish

You want the project page to feel like one cohesive workspace, not a collection of disconnected parts bolted together. Right now the dark sidebar and the dark header look like two separate elements that happen to share a color. The top bar is cluttered with things that belong elsewhere — breadcrumbs that duplicate the sidebar's "Back to Dashboard" button, a search bar nobody asked for, and a project name that's already displayed in the dark header below. Meanwhile, useful things like Partners, Reminders, My Team, Settings, and Profile are hidden behind dropdowns or missing entirely from the sidebar.

You're thinking like someone who actually uses this app 8 hours a day: the sidebar should be your home base for everything, the top bar should get out of the way, and premium features should be clearly marked so users know what they're unlocking.

## The changes

### 1. Connect sidebar and header visually

The dark header (bg-slate-950) currently sits inside the scrollable content area, completely disconnected from the sidebar. Fix: make the sidebar extend its dark background seamlessly — remove the rounded card treatment from the header and let it flow naturally as a continuation of the sidebar's dark zone. The header becomes a flat dark band across the top of the content area with no rounded corners on its left edge where it meets the sidebar.

### 2. Strip down the ProjectShell top bar

Remove from the top context bar:
- **"Home" breadcrumb** — redundant, sidebar has "Back to Dashboard"
- **Project name breadcrumb** — it's in the dark header already
- **Search button** — eliminate entirely
- The bar keeps: Logo, status dropdown, download button, notifications (compact), avatar (mobile only since desktop moves profile to sidebar)

### 3. Expand the ProjectSidebar with utility items

Add to the sidebar below the project nav groups:
- **My Team** (links to `/org/team`)
- **Partners** (links to `/partners`)
- **Reminders** (links to `/reminders`)

These go after a divider, below the project-specific items.

### 4. Move Settings + Profile to sidebar bottom

On desktop, push Settings and Profile to the bottom of the sidebar (use `mt-auto` to pin them to the bottom). Remove them from the top bar avatar dropdown on desktop (keep for mobile).

### 5. Add lock icons to premium features

Add a small lock icon (Lock from lucide) next to Schedule, Daily Log, and RFIs in the sidebar to indicate they're special/premium features. Show the lock inline after the label text in a muted color.

## Files to modify

| File | Change |
|------|--------|
| `ProjectShell.tsx` | Strip breadcrumbs (Home + project name), remove search button, hide avatar dropdown items on desktop |
| `ProjectSidebar.tsx` | Add My Team, Partners, Reminders section; add Settings + Profile at bottom with `mt-auto`; add Lock icon on Schedule, Daily Log, RFI |
| `ProjectHome.tsx` | Remove rounded corners from dark header left edge so it flows into sidebar; adjust header to feel connected |

## What is NOT changing
- No business logic changes
- Dashboard sidebar stays as-is
- Mobile navigation stays as-is
- Dark header content (project name, address, health/status badges) stays
- All routing stays the same

