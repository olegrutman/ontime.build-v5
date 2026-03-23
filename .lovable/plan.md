

# Make Scope Summary Rows Clickable with Item Popup

## What This Does
Each scope section row (e.g. "Exterior Framing — 4 items") in the Scope Summary card becomes clickable. Tapping it opens a popup showing the individual items that are turned ON in that section.

## Changes

### File: `src/components/project/ScopeDetailsTab.tsx`

1. **Add state** for the selected section: `const [selectedSection, setSelectedSection] = useState<string | null>(null)`

2. **Make rows clickable** (lines 219-225): Add `cursor-pointer hover:bg-muted` and `onClick={() => setSelectedSection(sec.slug)}` plus a `ChevronRight` icon

3. **Add a Dialog** that shows when `selectedSection` is set:
   - Title: the section label
   - Body: list of ON items in that section (filter `items` by section ID, then check against `onSelections`)
   - Each item shown as a row with a green check icon and item label

4. **Compute the items for the selected section**: find the section by slug, get its filtered items, filter to only those in `onSelections`

5. **Import** `Dialog, DialogContent, DialogHeader, DialogTitle` and `useState`

| File | Change |
|------|--------|
| `src/components/project/ScopeDetailsTab.tsx` | Add clickable rows with hover state, dialog popup showing ON items per section |

