
# Plan: Update All Category Filter Sequences + Add Other to Picker

## Summary

Update the product picker configuration so that:
1. **All categories use step-by-step filters** - no more empty filter arrays that skip directly to products
2. **Include "Other" category in the picker** - so users can browse the ~142 uncategorized items (cedar/hemlock lumber)

---

## Current Data Analysis

Based on the database, here are the spec fields that are actually populated for each category:

| Category | Best Filter Fields (by coverage) |
|----------|----------------------------------|
| **Decking** | dimension (100%), color (100%), manufacturer (100%), length (91%) |
| **Drywall** | dimension (64%), product_type (64%) |
| **Engineered** | use_type (13%), product_type (10%), length (7%) |
| **Exterior** | product_type (92%), use_type (89%), dimension (91%), manufacturer (49%), length (45%) |
| **FramingAccessories** | dimension (2%) - Very limited spec data |
| **FramingLumber** | dimension (100%), length (100%), wood_species (73%) |
| **Hardware** | thickness (1%), length (1%) - Very limited spec data |
| **Other** | dimension (100%), length (100%), wood_species (100%) |
| **Sheathing** | dimension (78%), thickness (65%), product_type (13%) |
| **Structural** | dimension (14%), product_type (14%), thickness (14%) |

---

## Proposed Changes

### File: `src/types/poWizardV2.ts`

#### 1. Add "OTHER" to VIRTUAL_CATEGORIES

```typescript
OTHER: {
  displayName: 'OTHER LUMBER',
  icon: '📦',
  dbCategory: 'Other',
  secondaryCategories: ['DECK BOARDS'], // Plus null items shown as "General"
},
```

#### 2. Update SECONDARY_DISPLAY_NAMES

Add entries for Other category and update Exterior to match actual database values:

```typescript
// Other
'DECK BOARDS': 'Deck Boards',  // Already exists, reuse

// Exterior Trim - actual database values
SIDING: 'Siding',
TRIM: 'Trim Boards',
'SOFFIT ': 'Soffit',  // Note: trailing space in DB
'METAL FLASHING': 'Metal Flashing',
'MOISTURE CONTROL': 'Moisture Control',
'SIDING ACCESSORIES': 'Siding Accessories',
```

#### 3. Update All SPEC_PRIORITY to Include Meaningful Filters

```typescript
export const SPEC_PRIORITY: Record<string, string[] | Record<string, string[]>> = {
  // Framing Lumber - fully populated
  FramingLumber: {
    default: ['wood_species', 'dimension', 'length'],
    STUDS: ['dimension', 'length'],
    DIMENSION: ['dimension', 'length'],
    WIDES: ['dimension', 'length'],
    TREATED: ['dimension', 'length'],
    'POST/TIMBER': ['wood_species', 'dimension', 'length'],
    'THIN BOARDS': ['dimension', 'length'],
  },
  
  // Hardware - use secondary_category only (specs are sparse)
  // Leave with minimal filters since only 9/791 have specs
  Hardware: ['thickness'],
  
  // Engineered wood - use available fields
  Engineered: {
    default: ['use_type', 'product_type', 'length'],
    LVL: ['use_type', 'product_type'],
    LSL: ['use_type', 'product_type'],
    'I JOISTS': ['use_type', 'product_type'],
    GLUELAM: ['use_type', 'product_type'],
    'RIM BOARD': ['use_type', 'product_type'],
  },
  
  // Sheathing
  Sheathing: ['thickness', 'dimension', 'product_type'],
  
  // Exterior trim - user requested sequence
  Exterior: ['manufacturer', 'use_type', 'product_type'],
  
  // Decking products - fully populated
  Decking: ['manufacturer', 'dimension', 'color', 'length'],
  
  // Framing Accessories - very sparse data, use what's available
  FramingAccessories: ['dimension'],
  
  // Drywall
  Drywall: ['dimension', 'product_type'],
  
  // Structural steel
  Structural: ['dimension', 'product_type', 'thickness'],
  
  // Other (cedar/hemlock) - fully populated
  Other: ['wood_species', 'dimension', 'length'],
};
```

#### 4. Update VIRTUAL_CATEGORIES.EXTERIOR.secondaryCategories

Match the actual database values:

```typescript
EXTERIOR: {
  displayName: 'EXTERIOR TRIM',
  icon: '🏠',
  dbCategory: 'Exterior',
  secondaryCategories: ['SIDING', 'TRIM', 'SOFFIT ', 'METAL FLASHING', 'MOISTURE CONTROL', 'SIDING ACCESSORIES'],
},
```

#### 5. Add FIELD_LABELS for new fields

```typescript
export const FIELD_LABELS: Record<string, string> = {
  dimension: 'Dimension',
  length: 'Length',
  color: 'Color',
  wood_species: 'Species',
  thickness: 'Thickness',
  finish: 'Finish',
  manufacturer: 'Manufacturer',
  use_type: 'Use Type',      // NEW
  product_type: 'Product Type', // NEW
};
```

#### 6. Update SECONDARY_DISPLAY_NAMES for Hardware

Match actual database values (note leading spaces in some):

```typescript
// Hardware - actual database values
' ANCHORS ': 'Anchors',
' ANGLE ': 'Angles',
' COLUMN HARDWARE ': 'Column Hardware',
' HANGER ': 'Joist Hangers',
' HOLD DOWN ': 'Hold Downs',
' OTHER ': 'Other Hardware',
' PLATES CONNECTORS AND CLIPS ': 'Plates & Connectors',
' POST HARDWARE ': 'Post Hardware',
' TIE & STRAP ': 'Ties & Straps',
```

---

## Updated Category Grid (10 tiles)

```text
Category Grid
├── FRAMING LUMBER 🪵 (292 items)
├── HARDWARE 🔩 (791 items)
├── ENGINEERED WOOD 📐 (72 items)
├── SHEATHING & PLYWOOD 📦 (23 items)
├── EXTERIOR TRIM 🏠 (148 items)
├── DECKING 🏡 (98 items)
├── FRAMING ACCESSORIES 🔧 (56 items)
├── DRYWALL 📋 (14 items)
├── STRUCTURAL STEEL 🏗️ (64 items)
└── OTHER LUMBER 📦 (142 items)  ← NEW
```

---

## Flow After Update

**Example: Exterior Trim Flow**
```text
EXTERIOR TRIM 🏠
└── [Secondary Category]
    ├── Siding (48)
    ├── Trim Boards (38)
    ├── Soffit (18)
    ├── Metal Flashing (17)
    ├── Moisture Control (15)
    └── Siding Accessories (12)
        └── [Manufacturer] → HARDIE, etc.
            └── [Use Type] → FIBER CEMENT, LAP, etc.
                └── [Product Type] → specific types
                    └── Product List
```

**Example: Other Flow**
```text
OTHER LUMBER 📦
└── [Secondary Category]
    ├── Deck Boards (1)
    └── General (141)
        └── [Species] → CEDAR, HEMLOCK
            └── [Dimension] → 1x4, 1x6, etc.
                └── [Length] → 8ft, 10ft, etc.
                    └── Product List
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/poWizardV2.ts` | Update VIRTUAL_CATEGORIES, SPEC_PRIORITY, SECONDARY_DISPLAY_NAMES, FIELD_LABELS |

---

## Technical Notes

1. **Hardware & FramingAccessories** - These categories have very sparse spec data, so filters may show limited options. The step-by-step filter will auto-skip fields with no values available.

2. **Database trailing spaces** - Some Hardware secondary categories have leading spaces (e.g., " HANGER "). The SECONDARY_DISPLAY_NAMES will need to match these exactly or the picker should trim values before lookup.

3. **Null secondary categories** - For "Other" category, 141 items have NULL secondary_category. The picker should handle this by showing them as "General" or similar.
