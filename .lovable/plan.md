
# Plan: Replace Catalog with New Inventory Data

## Summary

This plan will import the new inventory file (`Builders_Inventory_for_Lovable-2.xlsx`) containing **~1,700 products** into the `catalog_items` table, replacing the existing catalog data for the supplier. The product picker flow (Main Category → Secondary Category → Spec Filters → Products) will be updated to match the new category structure.

---

## New Inventory Structure Analysis

### Main Categories in New File (10 categories)

| Main Category | Secondary Categories | Product Count |
|--------------|---------------------|---------------|
| **DECKING** | DECK BOARDS, ACCESSORIES, POST CAP, POST SKIRT | ~110 |
| **DRYWALL** | SHAFTWALL, SHAFTWALL HARDWARE, EXTERIOR DRYWALL, INTERIOR DRYWALL, ACCESSORIES | ~25 |
| **ENGINEERED WOOD** | LVL, LSL, I JOISTS, RIM BOARD, GLUELAM | ~70 |
| **EXTERIOR TRIM** | SIDING, CORNER TRIM, STARTER STRIPS, WINDOW/DOOR TRIM | ~115 |
| **FRAMING ACCESSORIES** | FASTENERS, ADHESIVES, MOISTURE CONTROL, NAILS | ~120 |
| **FRAMING LUMBER** | STUDS, DIMENSION, WIDES, POST/TIMBER, TREATED, THIN BOARDS | ~480 |
| **HARDWARE** | HANGER, TIE & STRAP, ANCHORS, POST HARDWARE, COLUMN HARDWARE, HOLD DOWN, ANGLE, PLATES CONNECTORS AND CLIPS | ~780 |
| **SHEATING AND PLYWOOD** | OSB, CDX, ZIP, T&G, FIRE TREATED, HARDBOARD, SPECIALTY, CLIPS | ~30 |
| **STRUCTURAL STEEL** | COLUMN, I-BEAM, STEEL ANGLE | ~60 |
| **(No Category)** | Uncategorized cedar/hemlock items | ~50 |

### Column Mapping (Excel → Database)

| Excel Column | Database Column | Notes |
|--------------|-----------------|-------|
| `code` | `supplier_sku` | Primary identifier |
| `name` | `name` | Product name |
| `description` | `description` | Full description |
| `Main Category` | `category` | Mapped to enum |
| `Secondary Category` | `secondary_category` | Subcategory |
| `Manufacture` | `manufacturer` | Brand (HARDIE, FIBERON, etc.) |
| `Use` | `use_type` | Use context |
| `Type` | `product_type` | Product type |
| `Edge` | `edge_type` | Edge style |
| `Dimension` | `dimension` | Size (e.g., "2 in. x 4 in.") |
| `Thickness` | `thickness` | Thickness |
| `Depth` | `depth` | Depth measurement |
| `Width` | `width` | Width measurement |
| `Length` | `length` | Fixed length |
| `Minimum Length` | `min_length` | Variable length min |
| `Maximum Length` | `max_length` | Variable length max |
| `Length Increment` | `length_increment` | Step (e.g., 1 ft) |
| `Length Unit` | `length_unit` | Unit (ft, in) |
| `Color` | `color` | Color |
| `Finish` | `finish` | Finish type |
| `Bundle Name` | `bundle_type` | Bundle/Pallet/Box |
| `Bundle Count` | `bundle_qty` | Units per bundle |
| `Wood Species` | `wood_species` | Species |
| `Manufacture` | `manufacturer` | Manufacturer |
| `qtyType` | `uom_default` | "count" → "EA", "lf" → "LF" |

---

## Implementation Steps

### Step 1: Update Category Enum and Types

**File: `src/types/supplier.ts`**

Update `CatalogCategory` enum to support new main categories:

```typescript
export type CatalogCategory = 
  | 'Decking'
  | 'Drywall'
  | 'Engineered'      // Maps to "ENGINEERED WOOD"
  | 'Exterior'        // Maps to "EXTERIOR TRIM"
  | 'FramingAccessories' // NEW - Maps to "FRAMING ACCESSORIES"
  | 'FramingLumber'   // NEW - Maps to "FRAMING LUMBER"
  | 'Hardware'
  | 'Sheathing'       // Maps to "SHEATING AND PLYWOOD"
  | 'Structural'      // Maps to "STRUCTURAL STEEL"
  | 'Other';          // Fallback for uncategorized
```

Update `normalizeCategory()` function to map new Excel category names:

```typescript
const mapping: Record<string, CatalogCategory> = {
  'decking': 'Decking',
  'drywall': 'Drywall',
  'engineered wood': 'Engineered',
  'exterior trim': 'Exterior',
  'framing accessories': 'FramingAccessories',
  'framing lumber': 'FramingLumber',
  'hardware': 'Hardware',
  'sheating and plywood': 'Sheathing',
  'structural steel': 'Structural',
  // ... legacy mappings
};
```

---

### Step 2: Create Excel Import Edge Function

**New File: `supabase/functions/import-inventory-xlsx/index.ts`**

Edge function to:
1. Accept XLSX file upload via Supabase Storage path
2. Parse Excel data using a lightweight parser
3. Map columns to database schema
4. Perform bulk insert (batch of 500)

**Key mapping logic:**
- `qtyType: "count"` → `uom_default: "EA"`
- `qtyType: "lf"` → `uom_default: "LF"`
- `Bundle Count` → `bundle_qty` (parse integer)
- Category normalization as defined above

---

### Step 3: Update Database Schema (if needed)

**New columns already exist** based on schema analysis:
- `edge_type`, `depth`, `width`, `diameter`, `length_unit`, `length_increment` ✓
- `min_length`, `max_length` ✓

No migration needed - schema is already compatible.

---

### Step 4: Update Product Picker Virtual Categories

**File: `src/types/poWizardV2.ts`**

Replace `VIRTUAL_CATEGORIES` to match new inventory structure:

```typescript
export const VIRTUAL_CATEGORIES: Record<string, VirtualCategory> = {
  FRAMING_LUMBER: {
    displayName: 'FRAMING LUMBER',
    icon: '🪵',
    dbCategory: 'FramingLumber',
    secondaryCategories: ['STUDS', 'DIMENSION', 'WIDES', 'POST/TIMBER', 'TREATED', 'THIN BOARDS'],
  },
  HARDWARE: {
    displayName: 'HARDWARE',
    icon: '🔩',
    dbCategory: 'Hardware',
    secondaryCategories: [], // All hardware secondaries
  },
  ENGINEERED: {
    displayName: 'ENGINEERED WOOD',
    icon: '📐',
    dbCategory: 'Engineered',
    secondaryCategories: ['LVL', 'LSL', 'I JOISTS', 'GLUELAM', 'RIM BOARD'],
  },
  SHEATHING: {
    displayName: 'SHEATHING & PLYWOOD',
    icon: '📦',
    dbCategory: 'Sheathing',
    secondaryCategories: ['OSB', 'CDX', 'ZIP', 'T&G', 'FIRE TREATED', 'HARDBOARD', 'SPECIALTY'],
  },
  EXTERIOR: {
    displayName: 'EXTERIOR TRIM',
    icon: '🏠',
    dbCategory: 'Exterior',
    secondaryCategories: ['SIDING', 'CORNER TRIM', 'STARTER STRIPS', 'WINDOW/DOOR TRIM'],
  },
  DECKING: {
    displayName: 'DECKING',
    icon: '🏡',
    dbCategory: 'Decking',
    secondaryCategories: ['DECK BOARDS', 'ACCESSORIES', 'POST CAP', 'POST SKIRT'],
  },
  FRAMING_ACCESSORIES: {
    displayName: 'FRAMING ACCESSORIES',
    icon: '🔧',
    dbCategory: 'FramingAccessories',
    secondaryCategories: ['FASTENERS', 'ADHESIVES', 'MOISTURE CONTROL', 'NAILS'],
  },
  DRYWALL: {
    displayName: 'DRYWALL',
    icon: '📋',
    dbCategory: 'Drywall',
    secondaryCategories: ['EXTERIOR DRYWALL', 'INTERIOR DRYWALL', 'SHAFTWALL', 'ACCESSORIES'],
  },
  STRUCTURAL: {
    displayName: 'STRUCTURAL STEEL',
    icon: '🔧',
    dbCategory: 'Structural',
    secondaryCategories: ['COLUMN', 'I-BEAM', 'STEEL ANGLE'],
  },
};
```

Update `SECONDARY_DISPLAY_NAMES` with friendly names for new secondaries.

Update `SPEC_PRIORITY` to define filter sequences for new categories:

```typescript
export const SPEC_PRIORITY: Record<string, string[] | Record<string, string[]>> = {
  FramingLumber: {
    default: ['dimension', 'length'],
    STUDS: ['dimension', 'length'],
    DIMENSION: ['dimension', 'length'],
    WIDES: ['dimension', 'length'],
    TREATED: ['dimension', 'length'],
    'POST/TIMBER': ['wood_species', 'dimension', 'length'],
    'THIN BOARDS': ['dimension', 'length'],
  },
  Hardware: [], // Skip filters, go directly to products
  Engineered: {
    default: ['dimension'],
    LVL: ['dimension'],
    LSL: ['dimension'],
    'I JOISTS': ['dimension'],
    GLUELAM: ['dimension'],
    'RIM BOARD': ['dimension'],
  },
  Sheathing: ['thickness', 'dimension'],
  Exterior: ['manufacturer', 'dimension', 'color'],
  Decking: ['dimension', 'color', 'length', 'manufacturer'],
  FramingAccessories: [], // Skip filters
  Drywall: ['thickness', 'dimension'],
  Structural: [], // Skip filters, complex specs
};
```

---

### Step 5: Update Supplier Inventory Page

**File: `src/pages/SupplierInventory.tsx`**

Add XLSX upload support alongside CSV:
1. Accept `.xlsx` files in addition to `.csv`
2. For XLSX files, upload to Supabase Storage first
3. Call the new `import-inventory-xlsx` edge function
4. Handle progress/completion notifications

```typescript
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'xlsx' || extension === 'xls') {
    handleExcelUpload(file);
  } else if (extension === 'csv') {
    // Existing CSV handling
    handleCSVUpload(file);
  }
};

const handleExcelUpload = async (file: File) => {
  // 1. Upload to storage
  // 2. Call edge function
  // 3. Handle response
};
```

Update file input to accept both formats:
```html
<input type="file" accept=".csv,.xlsx,.xls" ... />
```

---

### Step 6: Update ProductPicker Component

**File: `src/components/po-wizard-v2/ProductPicker.tsx`**

Minor updates to handle new category structure:
- Update category fetching to work with new `dbCategory` values
- Ensure filter sequences use new `SPEC_PRIORITY` config
- Test navigation flow: Category → Secondary → Filters → Products

---

### Step 7: CategoryGrid Display Update

**File: `src/components/po-wizard-v2/CategoryGrid.tsx`**

No changes needed - component already renders from `VIRTUAL_CATEGORIES` dynamically.

---

## Import Strategy

### Option A: Full Replace (Recommended)
1. Delete all existing `catalog_items` for the supplier
2. Insert all new items from the Excel file
3. Clean slate with consistent data

### Option B: Upsert
1. Match by `supplier_id` + `supplier_sku`
2. Update existing, insert new
3. Risk of orphaned old SKUs

**Recommendation: Option A** - The new file is a complete inventory replacement.

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/types/supplier.ts` | Modify | Update `CatalogCategory` enum and `normalizeCategory()` |
| `src/types/poWizardV2.ts` | Modify | Update `VIRTUAL_CATEGORIES`, `SECONDARY_DISPLAY_NAMES`, `SPEC_PRIORITY` |
| `src/pages/SupplierInventory.tsx` | Modify | Add XLSX upload support |
| `supabase/functions/import-inventory-xlsx/index.ts` | Create | Excel parsing edge function |
| `src/components/po-wizard-v2/ProductPicker.tsx` | Modify | Minor adjustments for new categories |

---

## Product Picker Flow After Update

```text
Category Grid (9 tiles)
├── FRAMING LUMBER 🪵
│   ├── Studs
│   ├── Dimension Lumber
│   ├── Wide Boards (2x8, 2x10, 2x12)
│   ├── Posts & Timbers
│   ├── Treated Lumber
│   └── Thin Boards (1x)
├── HARDWARE 🔩
│   ├── Joist Hangers
│   ├── Ties & Straps
│   ├── Anchors
│   ├── Post Hardware
│   ├── Column Hardware
│   ├── Hold Downs
│   ├── Angles
│   └── Plates & Connectors
├── ENGINEERED WOOD 📐
│   ├── LVL Headers & Beams
│   ├── LSL Framing
│   ├── I-Joists
│   ├── Glulam Beams
│   └── Rim Board
├── SHEATHING & PLYWOOD 📦
│   ├── OSB
│   ├── CDX Plywood
│   ├── ZIP System
│   ├── Tongue & Groove
│   ├── Fire Treated
│   └── Specialty
├── EXTERIOR TRIM 🏠
│   ├── Siding
│   ├── Corner Trim
│   ├── Starter Strips
│   └── Window/Door Trim
├── DECKING 🏡
│   ├── Deck Boards
│   ├── Accessories
│   ├── Post Caps
│   └── Post Skirts
├── FRAMING ACCESSORIES 🔧
│   ├── Fasteners
│   ├── Adhesives
│   ├── Moisture Control
│   └── Nails
├── DRYWALL 📋
│   ├── Exterior Drywall
│   ├── Interior Drywall
│   ├── Shaftwall
│   └── Accessories
└── STRUCTURAL STEEL 🔧
    ├── Columns
    ├── I-Beams
    └── Steel Angles
```

---

## Technical Notes

1. **XLSX Parsing**: Will use a lightweight XLSX parser in the edge function (xlsx-parse-json or similar Deno-compatible library)

2. **Batch Insert**: Insert in batches of 500 to avoid transaction timeouts

3. **SKU Deduplication**: Excel file has some duplicate SKUs (same SKU, different lengths) - will keep the last occurrence

4. **Uncategorized Items**: Items at the end of the file without Main Category will be mapped to `'Other'` with their wood species in secondary_category

5. **Search Vector**: The existing trigger will automatically update `search_vector` on insert

6. **RLS**: No changes needed - existing policies allow supplier to manage their own items
