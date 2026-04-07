

# Add Unit Number & Room Fields to Inside Location Path

## Problem

When the user picks **Inside → Level → Unit interior** in the `VisualLocationPicker`, there are no follow-up fields for **unit number** and **room/area within the unit**. For multifamily and commercial projects, this specificity is essential — "Inside · Level 3 · Unit interior" is too vague; it should be "Inside · Level 3 · Unit 304 · Kitchen".

## Changes

### File: `src/components/change-orders/VisualLocationPicker.tsx`

1. **Add two new state fields**: `unitNumber` (string) and `roomInUnit` (string or selection).

2. **After "Unit interior" is selected**, show:
   - A text input: **"Unit #"** (e.g. "304", "A12") — free text, required
   - A pill/grid selector: **"Room / Area"** with options: Kitchen, Bathroom, Living Room, Bedroom, Laundry, Closet, Other (with custom input)

3. **Update `assembledTag`** to include the new parts:
   - Before: `Inside · Level 3 · Unit interior`
   - After: `Inside · Level 3 · Unit 304 · Kitchen`

4. **Update `isComplete`** — when area is "Unit interior", require `unitNumber` to be non-empty and a room selection to be made before allowing confirmation.

5. **Reset `unitNumber` and `roomInUnit`** when area selection changes away from "Unit interior".

### What the flow looks like

```text
┌─────────────────────────────────┐
│  [Inside]  [Outside]            │
├─────────────────────────────────┤
│  Level: [Ground] [Level 2] ... │
├─────────────────────────────────┤
│  Area:                          │
│  [Unit interior✓] [Corridor]    │
│  [Stairwell]      [Other]       │
├─────────────────────────────────┤
│  Unit #: [____304____]          │  ← NEW
├─────────────────────────────────┤
│  Room:                          │  ← NEW
│  [Kitchen] [Bathroom]           │
│  [Living]  [Bedroom]            │
│  [Laundry] [Closet] [Other]     │
├─────────────────────────────────┤
│  📍 Inside · Level 3 · Unit 304 · Kitchen
│  [ Confirm location ]           │
└─────────────────────────────────┘
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/change-orders/VisualLocationPicker.tsx` | Add unit number input + room selector when "Unit interior" is selected; update tag assembly and completion logic |

### What is NOT changing
- Wizard steps, database schema, RLS, other components
- Outside path, Corridor/Stairwell/Other paths remain unchanged

