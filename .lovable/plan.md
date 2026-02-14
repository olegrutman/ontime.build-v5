

# Redesign Product Picker Navigation for Easy Switching Between Estimate and Catalog

## The Problem Today

Right now, the PO wizard has two separate "worlds" for adding materials:

1. **Project Estimate mode** -- shows Packs and Materials tabs, lives inside the Items screen
2. **Full Catalog mode** -- opens the Product Picker as a separate modal on top of the wizard

These two worlds are disconnected. Once you open the catalog picker and start drilling into categories and filters, the only way to get back to the estimate view is to close the picker entirely and switch the toggle. There's no smooth way to jump back and forth. The back button inside the picker steps through filter stages, but never takes you "out" to the estimate browser.

## What We Will Change

### 1. Add a "home" screen inside the Product Picker

Instead of the picker always starting at the category grid, it will start at a **source selection screen** with two clear options:

- **From Project Estimate** (only shown when an approved estimate exists) -- tapping this shows the Packs and Materials tabs right inside the picker
- **Browse Full Catalog** -- tapping this goes to the category grid like today

This means the estimate browser moves from the Items screen into the Product Picker itself, so everything lives in one place.

### 2. Back button always works naturally

Since both paths now live inside the picker, the back button will always take you one step back:

- From category grid, back goes to the source selection screen
- From filters, back steps through filters one at a time (already working)
- From the estimate packs/materials view, back goes to the source selection screen
- From product list or quantity, back goes to the previous step

### 3. Items screen becomes simpler

The Items screen will no longer need the "Project Estimate / Full Catalog" toggle or the estimate browser. It just shows:

- The list of items you have added so far
- The "Change Pack" banner (if items came from a pack)
- An "Add Item" button that always opens the Product Picker (which now has both paths inside it)

## How It Will Feel to Use

1. You are on the Items screen with your list of materials
2. You tap "Add Item" -- the Product Picker opens
3. You see two big buttons: "From Project Estimate" and "Browse Full Catalog"
4. You pick one, drill down, add an item -- picker closes, item appears in your list
5. You tap "Add Item" again -- same two choices appear
6. This time you pick the other source -- no mode switching needed, just tap and go

## Files That Change

| File | What Changes |
|------|-------------|
| `ProductPicker.tsx` | Add a new "source" step as the first screen; embed the EstimateSubTabs inside the picker when estimate path is chosen; update back button logic for the new step |
| `ItemsScreen.tsx` | Remove the OrderingModeToggle and EstimateSubTabs; the "Add Item" button always opens the picker; keep the "Change Pack" banner |
| `POWizardV2.tsx` | Pass `hasApprovedEstimate` and estimate-related props to the ProductPicker instead of ItemsScreen |

## What Stays the Same

- The filter step-by-step logic (already fixed)
- Pack loading and "Change Pack" flow
- Quantity panel behavior
- Review screen
- Database queries and data flow
- PSM (Materials) browser internals
- Unmatched item editor

