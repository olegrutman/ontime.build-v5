

# "More" Menu for Project Bottom Nav

## What Changes

The project bottom nav currently shows 7 items in a single row, which is too cramped on mobile. We'll show the 4 most important tabs directly, and group the rest under a "More" button that opens a bottom drawer.

### Visible tabs (always shown):
- **Home** (back to dashboard)
- **Overview**
- **WOs** (Work Orders)
- **More** (opens drawer)

### Items inside the "More" drawer:
- SOV
- Invoices
- POs
- RFIs

If any of the "More" items is currently active, the "More" button gets the active (primary) color so the user knows they're on one of those tabs.

## Changes to `src/components/layout/BottomNav.tsx`

1. Split `projectItems` into two arrays:
   - `primaryProjectItems`: Home, Overview, WOs (3 items)
   - `moreProjectItems`: SOV, Invoices, POs, RFIs (4 items)

2. Add a `moreOpen` state (`useState<boolean>(false)`)

3. Render the 3 primary items as buttons, then a 4th "More" button with the `MoreHorizontal` (or `Ellipsis`) icon from lucide-react

4. The "More" button highlights as active if any `moreProjectItems` tab matches `activeTab`

5. Clicking "More" opens a Vaul `Drawer` (already available in the project) from the bottom, showing the 4 additional items as a vertical list with icons and labels

6. Tapping an item in the drawer navigates to that tab and closes the drawer

7. The drawer includes a `DrawerTitle` for accessibility ("More options")

8. Dashboard context stays unchanged (5 items, fits fine)

## Technical Details

```text
Bottom bar layout (project context):

[ Home ]  [ Overview ]  [ WOs ]  [ More ]
                                   |
                          opens Drawer with:
                           - SOV
                           - Invoices
                           - POs
                           - RFIs
```

- Import `Drawer, DrawerContent, DrawerTitle` from `@/components/ui/drawer`
- Import `MoreHorizontal` from `lucide-react`
- Add `useState` for drawer open state
- "More" button: check `moreProjectItems.some(i => i.tab === activeTab)` for active state
- Drawer items: render as buttons with icon + label, same click handler, close drawer on tap
- No changes to dashboard items or any other file
