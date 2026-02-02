

# Reorganize PO Wizard Categories for Construction Workflow

## Overview

Restructure the category tiles and filtering logic to match how construction crews think about materials. This involves:
1. Creating logical product groupings with user-friendly display names
2. Better secondary category names (e.g., "House Wrap & Tape" instead of "MOISTURE CONTROL")
3. Adjusting filter sequences for specific product types (POST/TIMBER starts with Species)
4. Adding UOM notes for engineered lumber

---

## Current Database Structure

The catalog uses a `category` field with values like "Other", "Hardware", "Engineered", "Decking" and a `secondary_category` for subtypes. Most lumber products are actually in the "Other" category with different secondary categories.

| DB Category | Secondary Categories |
|-------------|---------------------|
| Other | STUDS, DIMENSION, TREATED, WIDES, POST/TIMBER, SIDING, TRIM, SOFFIT, MOISTURE CONTROL, OSB, CDX, etc. |
| Engineered | GLUELAM, I JOISTS, LSL, LVL, RIM BOARD |
| Hardware | HANGER, TIE & STRAP, ANCHORS, POST HARDWARE, etc. |
| Decking | DECK BOARDS, ACCESSORIES, POST CAP, etc. |

---

## New Category Tile Structure

### Main Tiles (2-column grid)

| Tile Display | Maps To | Sub-Tiles |
|--------------|---------|-----------|
| LUMBER | Other (filtered) | Studs, Dimension, Treated, Wides |
| SIDING & EXTERIOR | Other (filtered) | Lap Siding, Panels, Trim, Soffit |
| HOUSE WRAP & TAPE | Other: MOISTURE CONTROL | Direct to products |
| POST & TIMBER | Other: POST/TIMBER | Filter by Species first |
| SHEATHING | Other (filtered) | OSB, CDX, ZIP |
| HARDWARE | Hardware | HANGERS, STRAPS, ANCHORS, etc. |
| ENGINEERED | Engineered | LVL, LSL, I-Joists, Glulam |
| DECKING | Decking | Deck Boards, Railing, Accessories |

---

## Technical Implementation

### 1. Update Types (`src/types/poWizardV2.ts`)

Add a new display category system that groups database secondary_categories:

```typescript
// Virtual categories that map to multiple secondary_categories
export interface VirtualCategory {
  displayName: string;
  icon: string;
  dbCategory: string; // The actual database category
  secondaryCategories: string[]; // Which secondary_categories to include
}

export const VIRTUAL_CATEGORIES: Record<string, VirtualCategory> = {
  LUMBER: {
    displayName: 'LUMBER',
    icon: '🪵',
    dbCategory: 'Other',
    secondaryCategories: ['STUDS', 'DIMENSION', 'TREATED', 'WIDES'],
  },
  SIDING: {
    displayName: 'SIDING & EXTERIOR',
    icon: '🏠',
    dbCategory: 'Other',
    secondaryCategories: ['SIDING', 'SIDING ACCESSORIES', 'TRIM', 'SOFFIT'],
  },
  HOUSE_WRAP: {
    displayName: 'HOUSE WRAP & TAPE',
    icon: '🧻',
    dbCategory: 'Other',
    secondaryCategories: ['MOISTURE CONTROL'],
  },
  POST_TIMBER: {
    displayName: 'POST & TIMBER',
    icon: '🌲',
    dbCategory: 'Other',
    secondaryCategories: ['POST/TIMBER', 'COLUMN'],
  },
  SHEATHING: {
    displayName: 'SHEATHING',
    icon: '📦',
    dbCategory: 'Other',
    secondaryCategories: ['OSB', 'CDX', 'ZIP', 'T&G'],
  },
  HARDWARE: {
    displayName: 'HARDWARE',
    icon: '🔩',
    dbCategory: 'Hardware',
    secondaryCategories: [], // All hardware
  },
  ENGINEERED: {
    displayName: 'ENGINEERED',
    icon: '📐',
    dbCategory: 'Engineered',
    secondaryCategories: [], // All engineered
  },
  DECKING: {
    displayName: 'DECKING',
    icon: '🏡',
    dbCategory: 'Decking',
    secondaryCategories: [], // All decking
  },
};
```

### 2. Update Filter Sequences

Add POST/TIMBER to start with wood_species and update other sequences:

```typescript
export const SPEC_PRIORITY: Record<string, string[] | Record<string, string[]>> = {
  // ... existing entries ...
  
  // Update Other category with better sequences
  Other: {
    default: ['dimension', 'length'],
    STUDS: ['dimension', 'length'],
    DIMENSION: ['dimension', 'length'],
    TREATED: ['dimension', 'length'],
    WIDES: ['dimension', 'length'],
    'POST/TIMBER': ['wood_species', 'dimension', 'length'], // Species FIRST
    COLUMN: ['wood_species', 'dimension', 'length'],
    SIDING: ['manufacturer', 'dimension'],
    'SIDING ACCESSORIES': ['manufacturer'],
    TRIM: ['dimension', 'length'],
    SOFFIT: ['dimension'],
    'MOISTURE CONTROL': ['manufacturer', 'dimension'], // Tyvek/Dow/Barricade
    OSB: ['thickness', 'dimension'],
    CDX: ['thickness', 'dimension'],
    ZIP: ['thickness', 'dimension'],
  },
  
  // Engineered - note about LF pricing
  Engineered: {
    default: ['dimension'],
    LVL: ['dimension'],
    LSL: ['dimension'],
    'I JOISTS': ['dimension'],
    GLUELAM: ['dimension'],
    'RIM BOARD': ['dimension'],
  },
};
```

### 3. Update Secondary Category Display Names

Add friendly names for secondary categories:

```typescript
export const SECONDARY_DISPLAY_NAMES: Record<string, string> = {
  // Lumber
  STUDS: 'Studs',
  DIMENSION: 'Dimension Lumber',
  TREATED: 'Treated Lumber',
  WIDES: 'Wide Boards',
  
  // Siding
  SIDING: 'Lap Siding & Panels',
  'SIDING ACCESSORIES': 'Siding Accessories',
  TRIM: 'Exterior Trim',
  SOFFIT: 'Soffit',
  
  // House Wrap
  'MOISTURE CONTROL': 'House Wrap & Seam Tape',
  
  // Post/Timber
  'POST/TIMBER': 'Posts & Timbers',
  COLUMN: 'Columns',
  
  // Sheathing
  OSB: 'OSB Sheathing',
  CDX: 'CDX Plywood',
  ZIP: 'ZIP System',
  'T&G': 'Tongue & Groove',
  
  // Engineered
  LVL: 'LVL Headers & Beams',
  LSL: 'LSL Framing',
  'I JOISTS': 'I-Joists',
  GLUELAM: 'Glulam Beams',
  'RIM BOARD': 'Rim Board',
};
```

---

## Files to Modify

### `src/types/poWizardV2.ts`
- Add `VirtualCategory` interface and `VIRTUAL_CATEGORIES` constant
- Add `SECONDARY_DISPLAY_NAMES` for friendly sub-category labels
- Update `SPEC_PRIORITY` with POST/TIMBER species-first and MOISTURE CONTROL manufacturer-first sequences
- Add `FIELD_LABELS` entry for `wood_species: 'Species'`

### `src/components/po-wizard-v2/ProductPicker.tsx`
- Update `fetchCategories()` to build virtual category counts by grouping secondary_categories
- When a virtual category is selected, filter by the mapped secondary_categories
- Pass the virtual category context through to secondary selection

### `src/components/po-wizard-v2/CategoryGrid.tsx`
- No structural changes needed (it receives categories as props)
- Categories will now be virtual categories with proper display names

### `src/components/po-wizard-v2/SecondaryCategoryList.tsx`
- Use `SECONDARY_DISPLAY_NAMES` to show friendly labels instead of raw DB values
- Sort by count descending as before

### `src/components/po-wizard-v2/StepByStepFilter.tsx`
- Use `FIELD_LABELS` to show "Species" instead of "wood_species"
- Already handles dynamic filter sequences correctly

---

## Query Changes

### Fetch Virtual Category Counts

Instead of grouping by `category`, group by `secondary_category` and aggregate into virtual categories:

```typescript
const fetchCategories = async () => {
  const { data } = await supabase
    .from('catalog_items')
    .select('secondary_category')
    .eq('supplier_id', supplierId);

  // Count by secondary_category
  const secondaryCounts: Record<string, number> = {};
  data?.forEach(item => {
    const sec = item.secondary_category || 'UNCATEGORIZED';
    secondaryCounts[sec] = (secondaryCounts[sec] || 0) + 1;
  });

  // Build virtual category counts
  const virtualCounts: CategoryCount[] = [];
  Object.entries(VIRTUAL_CATEGORIES).forEach(([key, virtual]) => {
    let count = 0;
    if (virtual.secondaryCategories.length === 0) {
      // Include all from that DB category - need separate query or filter
    } else {
      virtual.secondaryCategories.forEach(sec => {
        count += secondaryCounts[sec] || 0;
      });
    }
    if (count > 0) {
      virtualCounts.push({
        category: key, // Virtual key
        count,
        displayName: virtual.displayName,
        icon: virtual.icon,
      });
    }
  });

  return virtualCounts;
};
```

### Fetch Products for Virtual Category

When a virtual category is selected:

```typescript
const { data } = await supabase
  .from('catalog_items')
  .select('*')
  .eq('supplier_id', supplierId)
  .eq('category', virtualCategory.dbCategory)
  .in('secondary_category', virtualCategory.secondaryCategories);
```

---

## UX Flow Examples

### Example 1: Ordering 2x4 Studs

1. Tap **LUMBER** tile
2. See sub-tiles: Studs (18), Dimension (50), Treated (19), Wides (51)
3. Tap **Studs**
4. Select Dimension: "2 in. x 4 in."
5. Select Length: "92-5/8 in." or "104-5/8 in."
6. View products, select, add quantity

### Example 2: Ordering Tyvek

1. Tap **HOUSE WRAP & TAPE** tile
2. Select Manufacturer: "TYVEK", "DOW", or "BARRICADE"
3. Select Dimension/Size
4. View products (house wraps and seam tape)

### Example 3: Ordering Doug Fir Timbers

1. Tap **POST & TIMBER** tile
2. Select Species: "DOUG FIR" or "REDWOOD" (species FIRST)
3. Select Dimension: "3 in. x 10 in.", "4 in. x 4 in.", etc.
4. Select Length: "10 ft.", "12 ft.", etc.
5. View products

### Example 4: Ordering LVL Headers

1. Tap **ENGINEERED** tile
2. See sub-tiles: LVL (7), LSL (4), I-Joists (7), Glulam (49)
3. Tap **LVL Headers & Beams**
4. Select Dimension: "9 1/2", "11 7/8", "14", etc.
5. View products (note: sold per piece, priced by LF)

---

## Summary of Changes

| Change | Purpose |
|--------|---------|
| Virtual categories | Group secondary_categories into logical tiles |
| LUMBER tile | Groups Studs, Dimension, Treated, Wides |
| SIDING & EXTERIOR tile | Groups Siding, Trim, Soffit |
| HOUSE WRAP & TAPE tile | Better name for MOISTURE CONTROL |
| POST/TIMBER species-first | Construction crews think species first for timbers |
| Friendly secondary names | "LVL Headers & Beams" instead of "LVL" |
| Updated SPEC_PRIORITY | Right filter order for each product type |

