
# Plan: Enhanced Product Catalog Database with Smart Search

## Analysis Summary

### CSV Structure (1,698 items)

The uploaded CSV contains a rich construction materials inventory with 25 columns:

| Column | Purpose | Examples |
|--------|---------|----------|
| `qtyType` | Selling unit type | `count` (all rows = sold each) |
| `SKU` | Unique product code | `4812CDX`, `HU210-2` |
| `name` | Short product name | `4'X8' 15/32" CDX` |
| `description` | Full description | `4'X8' 15/32" CDX PLYWOOD` |
| `Main Category` | Primary grouping | `SHEATING AND PLYWOOD`, `HARDWARE`, `FRAMING LUMBER` |
| `Secondary Category` | Sub-category | `CDX`, `OSB`, `HANGER`, `STUDS`, `DIMENSION` |
| `Manufacture` | Brand/manufacturer | `TIMBERTECH`, `ADVANTECH`, `EVERGRAIN` |
| `Use` | Application type | `FASCIA`, `STAIR TREAD`, `THERMOPLY` |
| `Type` | Product type | `PLYWOOD`, `OSB`, `GROOVED`, `SOLID` |
| `Edge` | Edge treatment | `GROOVED` |
| `Dimension` | Size specification | `4 ft. x 8 ft.`, `2 in. x 4 in.` |
| `Thickness` | Thickness | `15/32 in.`, `7/16 in.` |
| `Depth`, `Width` | Additional dimensions | Various |
| `Min/Max Length` | Length range (for cut-to-length) | `3` to `60` (feet) |
| `Length Increment` | Cut increments | Used for LF items |
| `Length Unit` | Unit for length | `ft.`, `in.` |
| `Length` | Fixed length | `8 ft.`, `12 ft.`, `R/L` (random length) |
| `Diameter` | For round products | Steel columns |
| `Color` | Product color | `CAPE COD GREY`, `BROWN OAK` |
| `Finish` | Surface finish | `MILL` |
| `Bundle Name` | Pack type | `Pallet`, `Bundle`, `Box` |
| `Bundle Count` | Qty per pack | `65`, `100`, `250` |
| `Wood Species` | Species for lumber | `DOUG FIR`, `CEDAR`, `HEM FIR`, `WHITE FIR` |

### Product Categories Identified

| Main Category | Count | Examples |
|---------------|-------|----------|
| `SHEATING AND PLYWOOD` | ~40 | CDX, OSB, T&G, ZIP Wall |
| `DECKING` | ~100 | Evergrain, Timbertech, Fiberon |
| `FRAMING LUMBER` | ~400 | Dimension, Studs, Wides, Timbers |
| `ENGINEERED WOOD` | ~50 | LSL, LVL, I-Joists, Glulam, Rim Board |
| `HARDWARE` | ~600 | Hangers, Straps, Hold-downs, Anchors |
| `EXTERIOR TRIM` | ~100 | Siding, Corners, Vents |
| `FRAMING ACCESSORIES` | ~80 | Fasteners, Adhesives |
| `DRYWALL` | ~20 | Interior, Exterior, Shaftwall |
| `FINISH LUMBER` | ~100 | Cedar, Hemlock boards |
| `STRUCTURAL STEEL` | ~80 | I-Beams, Columns, Angles |

### Selling Unit Types

All items have `qtyType = count`, meaning:
- Sold as **individual units** (EA - each)
- Many items available in **bundles/pallets/boxes** for bulk ordering
- Some engineered products (LVL, Glulam) sold by **linear foot** (noted in description `/LF`)

---

## Proposed Database Schema

### Option 1: Extend Existing `catalog_items` Table (Recommended)

Add new columns to capture the rich attributes from this CSV without breaking existing functionality:

```text
catalog_items (enhanced)
├── id (existing)
├── supplier_id (existing)
├── supplier_sku (existing) 
├── category (existing enum - needs expansion)
├── description (existing)
├── uom_default (existing)
├── size_or_spec (existing)
├── search_vector (existing)
├── search_keywords (existing)
│
├── NEW COLUMNS:
├── name TEXT                    -- Short name (e.g., "4'X8' 15/32" CDX")
├── secondary_category TEXT      -- Sub-category (OSB, CDX, HANGER, etc.)
├── manufacturer TEXT            -- Brand (Timbertech, Simpson, etc.)
├── use_type TEXT                -- Application (FASCIA, STAIR TREAD)
├── product_type TEXT            -- Type (PLYWOOD, OSB, GROOVED)
├── dimension TEXT               -- Size (4 ft. x 8 ft.)
├── thickness TEXT               -- Thickness (15/32 in.)
├── length TEXT                  -- Length (8 ft., R/L)
├── color TEXT                   -- Color (CAPE COD GREY)
├── finish TEXT                  -- Finish (MILL)
├── wood_species TEXT            -- Species (DOUG FIR, CEDAR)
├── bundle_type TEXT             -- Pack type (Pallet, Bundle, Box)
├── bundle_qty INTEGER           -- Qty per bundle (65, 100)
├── min_length NUMERIC           -- Min cut length (for LF items)
├── max_length NUMERIC           -- Max cut length (for LF items)
└── attributes JSONB             -- Flexible storage for additional attrs
```

### Update Category Enum

The existing enum needs expansion to match the CSV categories:

```sql
-- Current categories:
'Dimensional', 'Engineered', 'Sheathing', 'Hardware', 'Fasteners', 
'Other', 'Decking', 'Exterior', 'Interior', 'Roofing', 'Structural', 
'Adhesives', 'Insulation', 'Concrete'

-- Category mapping from CSV:
'SHEATING AND PLYWOOD' → 'Sheathing'
'DECKING' → 'Decking'  
'FRAMING LUMBER' → 'Dimensional'
'ENGINEERED WOOD' → 'Engineered'
'HARDWARE' → 'Hardware'
'FRAMING ACCESSORIES' → 'Fasteners' or 'Adhesives'
'EXTERIOR TRIM' → 'Exterior'
'DRYWALL' → 'Interior'
'FINISH LUMBER' → 'Dimensional'
'STRUCTURAL STEEL' → 'Structural'
```

---

## Optimized Search Strategy

### Goal: Minimal Steps to Find a Product

**Current flow (3-4 steps):**
1. Type search query
2. Select category filter
3. Select supplier filter  
4. Click search

**Optimized flow (1-2 steps):**
1. Start typing → **instant results** (typeahead/autocomplete)
2. Optional: tap a filter chip to narrow down

### Search Implementation

**1. Smart Full-Text Search with PostgreSQL**

```sql
CREATE OR REPLACE FUNCTION search_catalog_v2(
  search_query TEXT DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  secondary_category_filter TEXT DEFAULT NULL,
  manufacturer_filter TEXT DEFAULT NULL,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  supplier_sku TEXT,
  name TEXT,
  description TEXT,
  category TEXT,
  secondary_category TEXT,
  manufacturer TEXT,
  dimension TEXT,
  thickness TEXT,
  length TEXT,
  color TEXT,
  uom_default TEXT,
  bundle_type TEXT,
  bundle_qty INTEGER,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id,
    ci.supplier_sku,
    ci.name,
    ci.description,
    ci.category::TEXT,
    ci.secondary_category,
    ci.manufacturer,
    ci.dimension,
    ci.thickness,
    ci.length,
    ci.color,
    ci.uom_default,
    ci.bundle_type,
    ci.bundle_qty,
    CASE 
      WHEN search_query IS NULL THEN 0
      ELSE ts_rank(ci.search_vector, websearch_to_tsquery('english', search_query))
    END AS rank
  FROM catalog_items ci
  WHERE 
    (search_query IS NULL OR 
     ci.search_vector @@ websearch_to_tsquery('english', search_query) OR
     ci.supplier_sku ILIKE '%' || search_query || '%')
    AND (category_filter IS NULL OR ci.category::TEXT = category_filter)
    AND (secondary_category_filter IS NULL OR ci.secondary_category ILIKE secondary_category_filter)
    AND (manufacturer_filter IS NULL OR ci.manufacturer ILIKE manufacturer_filter)
  ORDER BY 
    -- Exact SKU match first
    CASE WHEN ci.supplier_sku ILIKE search_query THEN 0 ELSE 1 END,
    rank DESC,
    ci.name
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;
```

**2. Enhanced Search Vector (auto-generated trigger)**

```sql
-- Update trigger to build comprehensive search vector
CREATE OR REPLACE FUNCTION update_catalog_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.supplier_sku, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.secondary_category, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.manufacturer, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.dimension, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.thickness, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.color, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.wood_species, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(COALESCE(NEW.search_keywords, '{}'), ' ')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## User Search Flow (Optimized)

### Scenario 1: User knows the SKU
**Search:** `HU210-2`
**Result:** Instant exact match → JOIST HANGER HD DBL 2X10

### Scenario 2: User knows the material type
**Search:** `2x4 stud hem fir`
**Results:** Filtered to HEM FIR 2x4 studs (92-5/8", 104-5/8", etc.)

### Scenario 3: User browsing by category
**Flow:**
1. User clicks "Lumber" category chip
2. Secondary chips appear: `Studs | Dimension | Wides | Treated`
3. User taps "Studs" → sees all stud options

### Scenario 4: User needs a specific size
**Search:** `4x8 osb 7/16`
**Result:** All 4'x8' OSB panels at 7/16" thickness

---

## UI Components to Create/Modify

### 1. Enhanced Catalog Search Component

Features:
- **Typeahead search** with debounced API calls (300ms)
- **Category chips** for quick filtering
- **Secondary category** dropdown (dynamically populated based on main category)
- **Smart result cards** showing key attributes at a glance

### 2. Product Detail Sheet

When clicking a result:
- Show all product attributes
- Bundle/pack information with unit conversion
- "Add to Order" action with quantity input

### 3. Quick Filters Panel

Persistent filter chips:
- Main categories (Lumber, Hardware, Decking, etc.)
- Common manufacturers (Simpson, Timbertech, etc.)
- Wood species (for lumber)
- Treatment type (Treated, Borate, etc.)

---

## Implementation Summary

### Database Migration

```text
1. Add new columns to catalog_items table
2. Create improved search_catalog_v2 function
3. Update search vector trigger for new columns
4. Backfill search vectors for existing items
```

### File Changes

| File | Change |
|------|--------|
| `src/types/supplier.ts` | Add new types for enhanced catalog items |
| `src/components/CatalogSearch.tsx` | Add typeahead, category chips, enhanced results |
| `src/pages/SupplierInventory.tsx` | Update CSV parser for new format |

### CSV Import Mapping

```text
CSV Column → Database Column
─────────────────────────────
SKU → supplier_sku
name → name
description → description  
Main Category → category (mapped to enum)
Secondary Category → secondary_category
Manufacture → manufacturer
Use → use_type
Type → product_type
Dimension → dimension
Thickness → thickness
Length → length
Color → color
Finish → finish
Wood Species → wood_species
Bundle Name → bundle_type
Bundle Count → bundle_qty
qtyType → uom_default (mapped: count→EA)
```

---

## Summary of User Benefits

| Current State | After Implementation |
|---------------|---------------------|
| Search requires explicit button click | Instant typeahead results |
| Category dropdown with 14 options | Visual category chips + secondary filters |
| Basic text search | Smart search: SKU, dimensions, species, color |
| No bundle/pack info | Clear bundle sizes for bulk ordering |
| Limited product attributes | Rich product cards with all specs visible |

The goal is **2 steps max** to find any product:
1. Type or tap category
2. See results instantly

