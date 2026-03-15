

# UX Improvements: 3-Step PO Wizard

## Current Pain Points

1. **Step 1 (Header)** shows 2 read-only fields (Project, Address) that waste space and add visual noise. When there's only one supplier, the entire screen has minimal user input yet still requires a tap to continue.
2. **Step indicators** are a thin 2px progress bar with no step labels — users can't see where they are or what's coming.
3. **Step 3 (Review)** delivery details are read-only. To fix a date or note, the user must navigate back twice through the items screen.
4. **No delete confirmation** on item removal — one accidental tap loses the item.
5. **Footer buttons** are inconsistent across screens — sometimes 2 buttons, sometimes 3, with varying layouts.

## Proposed Changes

### 1. Replace progress bar with labeled step indicator
Replace the thin `wz-progress` bar with a 3-dot step indicator showing: **Delivery → Items → Review**. Each dot shows completed (check), active (filled), or upcoming (outline) state. This gives users clear orientation.

**Files**: `POWizardV2.tsx`, `index.css`

### 2. Auto-advance past Header when single supplier
When there's only one supplier (the common case), auto-set the supplier and skip directly to the Items screen. Move the optional fields (delivery date, window, notes) into an expandable "Delivery Details" section on the Review screen so users can still set them without an extra step.

**Files**: `POWizardV2.tsx`, `HeaderScreen.tsx`, `ReviewScreen.tsx`

### 3. Make delivery details editable on Review screen
Convert the read-only delivery details block on Review into an inline-editable section. Tapping "Edit" on the delivery block expands it with the date picker, window toggles, and notes field — no need to navigate backwards.

**Files**: `ReviewScreen.tsx`

### 4. Add delete confirmation for item removal
Wrap the trash button action in a confirmation (inline "Are you sure?" or a small popover) to prevent accidental deletions, especially on mobile.

**Files**: `ItemsScreen.tsx`

### 5. Streamline footer button layout
Standardize all footers to a consistent 2-button layout: secondary action (left) + primary action (right, full-width). On Review, collapse "Add More" and "Edit" into the items section header, keeping the footer clean with just Back + Submit.

**Files**: `ItemsScreen.tsx`, `ReviewScreen.tsx`

## Technical Details

### Step Indicator Component
```text
  ●─────────○─────────○
Delivery   Items    Review
```
- A small inline component rendered in `POWizardV2.tsx` replacing `wz-progress`
- Uses `screen` state to determine active step
- Completed steps show a checkmark icon

### Auto-advance Logic
In `POWizardV2.tsx`, after suppliers load:
- If `suppliers.length === 1` AND not in edit mode → set supplier, set initial screen to `'items'` (or `'picker'` if no items)
- Header screen remains accessible via Back button from Items

### Inline Delivery Edit on Review
- Add a `[editingDelivery, setEditingDelivery]` state to ReviewScreen
- When collapsed: current read-only view with an "Edit" button
- When expanded: date picker, AM/PM/ANY toggles, notes textarea
- Changes flow through `onChange` prop (already wired for tax)

### Delete Confirmation
- Use an `AlertDialog` (already in the UI library) triggered by the trash icon
- Brief message: "Remove [item name]?"
- Two buttons: Cancel / Remove

## Files to Modify

| File | Change |
|---|---|
| `src/components/po-wizard-v2/POWizardV2.tsx` | Replace progress bar with step indicator; auto-advance for single supplier |
| `src/components/po-wizard-v2/HeaderScreen.tsx` | Minor — still used for multi-supplier case |
| `src/components/po-wizard-v2/ItemsScreen.tsx` | Add delete confirmation; clean up footer |
| `src/components/po-wizard-v2/ReviewScreen.tsx` | Inline-editable delivery details; move "Add More" out of footer; accept `onChange` for delivery fields |
| `src/index.css` | Replace `wz-progress` styles with step indicator styles |

