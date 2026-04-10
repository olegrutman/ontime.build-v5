

# Remove Search Box and "Dashboard" Breadcrumb from Top Bar

## What's changing
On the ContextBar (the fixed header), remove:
1. **The center breadcrumbs section** — "Dashboard" text is redundant since the sidebar already shows the active page
2. **The Search button** — search is still accessible via ⌘K keyboard shortcut and the CommandPalette remains functional

## Implementation

| # | File | Change |
|---|------|--------|
| 1 | `src/components/app-shell/ContextBar.tsx` | Remove the center `<nav>` breadcrumbs section entirely. Remove the search `<button>` from the right actions div. Keep: logo, notification bell, new button, mobile avatar dropdown. |
| 2 | `src/components/app-shell/ContextBar.tsx` | Remove `breadcrumbs` from the props interface since it's no longer used. Remove `onCommandPalette` from props. |
| 3 | `src/components/app-shell/AppShell.tsx` | Stop passing `breadcrumbs` and `onCommandPalette` to `ContextBar`. The ⌘K handler and CommandPalette component stay — search still works via keyboard shortcut. |

## What stays
- Logo on the left
- Notification bell
- "New" button (when applicable)
- Mobile avatar/dropdown menu
- ⌘K keyboard shortcut still opens CommandPalette

