
# Plan: Replace Catalog with New Inventory File and Update Product Picker

## Overview
This plan replaces the existing catalog data with the new inventory Excel file and updates the database schema and product picker to match the new category structure.

---

## Inventory File Analysis

### Columns Detected (26 columns total)
| Column | Purpose | Maps To |
|--------|---------|---------|
| qtyType | Unit counting method | `uom_default` (count→EA) |
| code | Product SKU | `supplier_sku` |
| name | Product name | `name` |
| description | Full description | `description` |
| Main Category | Primary category | `category` (new values) |
| Secondary Category | Sub-category | `secondary_category` |
| Manufacture_Deck | Deck manufacturer | `manufacturer` |
| Use | Material type (e.g., FIBER CEMENT) | `use_type` |
| Type | Product type (LAP, PANEL) | `product_type` |
| Dimension | Size (e.g., "2 in. x 4 in.") | `dimension` |
| Thickness | Thickness value | `thickness` |
| Length | Fixed length | `length` |
| Color | Product color | `color` |
| Finish | Finish type | `finish` |
| Bundle Name | Bundle type | `bundle_type` |
| Bundle Count | Qty per bundle | `bundle_qty` |
| Wood Species | Species (DOUG FIR, etc.) | `wood_species` |
| Manufacture | General manufacturer | `manufacturer` |
| Minimum Length | For variable items | `min_length` |
| Maximum Length | For variable items | `max_length` |
| Length Increment | Step size | (stored in attributes) |
| Length Unit | Unit (in, ft) | (stored in attributes) |

### Main Categories Found (8 total)
| Category from File | DB Enum Value | Count (est.) |
|--------------------|---------------|--------------|
| DECKING | Decking | ~50 |
| EXTERIOR TRIM | Exterior | ~200 |
| FRAMING ACCESSORIES | Fasteners | ~50 |
| FRAMING LUMBER | Dimensional | ~400 |
| HARDWARE | Hardware | ~500 |
| SHEATING AND PLYWOOD | Sheathing | ~50 |
| STRUCTURAL STEEL | Structural | ~100 |
| ENGINEERED | Engineered | ~100 |

### Secondary Categories Found (~30 unique)
- DECK BOARDS, ACCESSORIES, POST CAP
- SIDING, SOFFIT, TRIM, SIDING ACCESSORIES, METAL FLASHING, MOISTURE CONTROL
- FASTENERS
- DIMENSION, STUDS, WIDES, POST/TIMBER, TREATED
- HANGER, ANGLE, ANCHORS, POST HARDWARE, TIE & STRAP, PLATES CONNECTORS AND CLIPS
- OSB, CDX, ZIP, T&G, FIRE TREATED, HARDBOARD, SPECIALTY, CLIPS
- COLUMN, I-BEAM, STEEL ANGLE
- LVL, I JOISTS, RIM BOARD, GLUELAM

---

## Database Changes

### 1. Create Edge Function for Batch Import
Create a new edge function to handle XLSX parsing and bulk insert:

```text
supabase/functions/import-inventory/index.ts
```

This function will:
- Accept the Excel file as multipart/form-data
- Parse XLSX using a Deno-compatible library
- Map columns to database fields
- Delete all existing catalog items for the supplier
- Insert new items in batches

### 2. Update Existing `catalog_items` Table Schema
Add new columns if missing and update indexes:

```sql
-- Add columns for new attributes
ALTER TABLE catalog_items
ADD COLUMN IF NOT EXISTS edge_type text,
ADD COLUMN IF NOT EXISTS depth text,
ADD COLUMN IF NOT EXISTS width text,
ADD COLUMN IF NOT EXISTS diameter text,
ADD COLUMN IF NOT EXISTS length_unit text,
ADD COLUMN IF NOT EXISTS length_increment numeric;

-- Create index on new Main Category values
CREATE INDEX IF NOT EXISTS idx_catalog_main_secondary 
ON catalog_items(category, secondary_category);
```

### 3. Update `catalog_category` Enum (if needed)
The current enum already covers most categories:
- ✅ Decking, Engineered, Sheathing, Hardware, Fasteners, Exterior, Structural
- ⚠️ Need to ensure "FRAMING LUMBER" maps to "Dimensional"
- ⚠️ Need to ensure "SHEATING AND PLYWOOD" maps to "Sheathing"

---

## Frontend Changes

### 1. Update `VIRTUAL_CATEGORIES` in `src/types/poWizardV2.ts`

Revise to match the new Main Categories and their secondaries:

```typescript
export const VIRTUAL_CATEGORIES: Record<string, VirtualCategory> = {
  FRAMING_LUMBER: {
    displayName: 'FRAMING LUMBER',
    icon: '🪵',
    dbCategory: 'Dimensional',
    secondaryCategories: ['DIMENSION', 'STUDS', 'WIDES', 'POST/TIMBER', 'TREATED'],
  },
  EXTERIOR_TRIM: {
    displayName: 'EXTERIOR TRIM',
    icon: '🏠',
    dbCategory: 'Exterior',
    secondaryCategories: ['SIDING', 'SOFFIT', 'TRIM', 'SIDING ACCESSORIES', 'METAL FLASHING', 'MOISTURE CONTROL'],
  },
  DECKING: {
    displayName: 'DECKING',
    icon: '🏡',
    dbCategory: 'Decking',
    secondaryCategories: ['DECK BOARDS', 'ACCESSORIES', 'POST CAP'],
  },
  HARDWARE: {
    displayName: 'HARDWARE',
    icon: '🔩',
    dbCategory: 'Hardware',
    secondaryCategories: ['HANGER', 'ANGLE', 'ANCHORS', 'POST HARDWARE', 'TIE & STRAP', 'PLATES CONNECTORS AND CLIPS'],
  },
  SHEATHING: {
    displayName: 'SHEATHING & PLYWOOD',
    icon: '📦',
    dbCategory: 'Sheathing',
    secondaryCategories: ['OSB', 'CDX', 'ZIP', 'T&G', 'FIRE TREATED', 'HARDBOARD', 'SPECIALTY', 'CLIPS'],
  },
  ENGINEERED: {
    displayName: 'ENGINEERED',
    icon: '📐',
    dbCategory: 'Engineered',
    secondaryCategories: ['LVL', 'I JOISTS', 'RIM BOARD', 'GLUELAM'],
  },
  STRUCTURAL_STEEL: {
    displayName: 'STRUCTURAL STEEL',
    icon: '🔧',
    dbCategory: 'Structural',
    secondaryCategories: ['COLUMN', 'I-BEAM', 'STEEL ANGLE'],
  },
  FRAMING_ACCESSORIES: {
    displayName: 'FRAMING ACCESSORIES',
    icon: '🔧',
    dbCategory: 'Fasteners',
    secondaryCategories: ['FASTENERS'],
  },
};
```

### 2. Update `SECONDARY_DISPLAY_NAMES` for Friendly Labels
Add friendly names for all secondary categories:

```typescript
export const SECONDARY_DISPLAY_NAMES: Record<string, string> = {
  // Framing Lumber
  DIMENSION: 'Dimension Lumber',
  STUDS: 'Wall Studs',
  WIDES: 'Wide Boards (2x8+)',
  'POST/TIMBER': 'Posts & Timbers',
  TREATED: 'Pressure Treated',
  
  // Exterior Trim
  SIDING: 'Lap Siding & Panels',
  SOFFIT: 'Soffit',
  TRIM: 'Trim Boards',
  'SIDING ACCESSORIES': 'Corners & Accessories',
  'METAL FLASHING': 'Metal Flashing',
  'MOISTURE CONTROL': 'House Wrap & Tape',
  
  // Decking
  'DECK BOARDS': 'Deck Boards',
  ACCESSORIES: 'Deck Accessories',
  'POST CAP': 'Post Caps',
  
  // Hardware
  HANGER: 'Joist Hangers',
  ANGLE: 'Angles & Brackets',
  ANCHORS: 'Anchors',
  'POST HARDWARE': 'Post Hardware',
  'TIE & STRAP': 'Ties & Straps',
  'PLATES CONNECTORS AND CLIPS': 'Plates & Connectors',
  
  // Sheathing
  OSB: 'OSB',
  CDX: 'CDX Plywood',
  ZIP: 'ZIP System',
  'T&G': 'Tongue & Groove',
  'FIRE TREATED': 'Fire Treated',
  HARDBOARD: 'Hardboard',
  SPECIALTY: 'Specialty Panels',
  CLIPS: 'Plywood Clips',
  
  // Engineered
  LVL: 'LVL Beams',
  'I JOISTS': 'I-Joists',
  'RIM BOARD': 'Rim Board',
  GLUELAM: 'Glulam Beams',
  
  // Structural Steel
  COLUMN: 'Steel Columns',
  'I-BEAM': 'I-Beams',
  'STEEL ANGLE': 'Steel Angles',
  
  // Framing Accessories
  FASTENERS: 'Fasteners & Screws',
};
```

### 3. Update `SPEC_PRIORITY` for Filter Sequences
Define the filter flow for each category (Main → Secondary → Type):

```typescript
export const SPEC_PRIORITY: Record<string, string[] | Record<string, string[]>> = {
  Dimensional: {
    default: ['dimension', 'length', 'wood_species'],
    DIMENSION: ['dimension', 'length', 'wood_species'],
    STUDS: ['dimension', 'length'],
    WIDES: ['dimension', 'length', 'wood_species'],
    'POST/TIMBER': ['dimension', 'length'],
    TREATED: ['dimension', 'length', 'color'],
  },
  Exterior: {
    default: ['manufacturer', 'product_type', 'dimension'],
    SIDING: ['manufacturer', 'product_type', 'dimension', 'finish'],
    SOFFIT: ['manufacturer', 'product_type', 'dimension'],
    TRIM: ['dimension', 'length', 'finish'],
    'METAL FLASHING': ['product_type', 'dimension'],
    'MOISTURE CONTROL': ['manufacturer'],
  },
  Decking: ['dimension', 'color', 'length', 'manufacturer'],
  Hardware: {
    default: [],
    HANGER: [],
    ANGLE: [],
    // Hardware goes straight to product list (no spec filters)
  },
  Sheathing: ['thickness', 'dimension'],
  Engineered: ['dimension'],
  Structural: {
    default: ['dimension'],
    COLUMN: ['dimension', 'min_length', 'max_length'],
    'I-BEAM': ['dimension'],
    'STEEL ANGLE': ['dimension', 'thickness'],
  },
  Fasteners: [],
};
```

---

## Product Picker Flow (Updated)

```text
┌─────────────────────────────────────────────────────────────┐
│                    SELECT CATEGORY                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 🪵       │ │ 🏠       │ │ 🏡       │ │ 🔩       │       │
│  │ FRAMING  │ │ EXTERIOR │ │ DECKING  │ │ HARDWARE │       │
│  │ LUMBER   │ │ TRIM     │ │          │ │          │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 📦       │ │ 📐       │ │ 🔧       │ │ 🔧       │       │
│  │ SHEATHING│ │ENGINEERED│ │ STRUCT   │ │ FRAMING  │       │
│  │ & PLYWOOD│ │          │ │ STEEL    │ │ ACCS     │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              SELECT TYPE (Secondary Category)               │
│  Example: FRAMING LUMBER selected                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Dimension Lumber                              (250) →│  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Wall Studs                                     (50) →│  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Wide Boards (2x8+)                            (100) →│  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Posts & Timbers                                (75) →│  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Pressure Treated                               (40) →│  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 FILTER BY SPEC (if applicable)              │
│  Example: Dimension Lumber selected                         │
│  Step 1: Select Dimension                                   │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│  │ 2x4    │ │ 2x6    │ │ 2x10   │ │ 2x12   │              │
│  └────────┘ └────────┘ └────────┘ └────────┘              │
│                                                             │
│  Step 2: Select Length                                      │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│  │ 8 ft   │ │ 10 ft  │ │ 12 ft  │ │ 16 ft  │              │
│  └────────┘ └────────┘ └────────┘ └────────┘              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    SELECT PRODUCT                           │
│  (Final product list after filters)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Database Migration
Add any missing columns to `catalog_items` table.

### Step 2: Create Import Edge Function
Build the edge function to:
- Parse XLSX file
- Map columns to database fields
- Clear existing catalog for supplier
- Bulk insert new items

### Step 3: Update Supplier Inventory Page
Modify the CSV upload to support XLSX and use the new edge function.

### Step 4: Update Type Definitions
Update `src/types/poWizardV2.ts` with new category mappings.

### Step 5: Update Product Picker
Ensure `CategoryGrid` displays all 8 main categories properly.

### Step 6: Import the Data
Run the import for this specific Excel file.

### Step 7: Test the Flow
Verify Main Category → Secondary Category → Type → Product selection works correctly.

---

## Technical Details

### Column Mapping (Excel → Database)
| Excel Column | DB Column | Transform |
|--------------|-----------|-----------|
| code | supplier_sku | Direct |
| name | name | Direct |
| description | description | Direct |
| Main Category | category | Map to enum |
| Secondary Category | secondary_category | UPPERCASE |
| Manufacture_Deck OR Manufacture | manufacturer | Coalesce |
| Use | use_type | Direct |
| Type | product_type | Direct |
| Dimension | dimension | Direct |
| Thickness | thickness | Direct |
| Length | length | Direct |
| Color | color | Direct |
| Finish | finish | Direct |
| Bundle Name | bundle_type | Direct |
| Bundle Count | bundle_qty | Parse int |
| Wood Species | wood_species | Direct |
| qtyType | uom_default | Map (count→EA) |
| Minimum Length | min_length | Parse number |
| Maximum Length | max_length | Parse number |

### Category Mapping (Excel Main Category → DB Enum)
| Excel | DB Enum |
|-------|---------|
| DECKING | Decking |
| EXTERIOR TRIM | Exterior |
| FRAMING ACCESSORIES | Fasteners |
| FRAMING LUMBER | Dimensional |
| HARDWARE | Hardware |
| SHEATING AND PLYWOOD | Sheathing |
| STRUCTURAL STEEL | Structural |
| ENGINEERED | Engineered |
