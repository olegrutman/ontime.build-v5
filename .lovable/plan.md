

# PO Wizard Redesign: Mobile-First, Zero-Typing Field Experience

## Overview

Complete redesign of the Purchase Order wizard to match the "walking the lumber yard" experience. The new wizard eliminates required typing, enforces project-locked context, and provides a guided category-driven product picker instead of search-first browsing.

---

## Architecture Changes

### New 3-Screen Flow

```text
┌────────────────────────────────────────────────────────────────────┐
│                        SCREEN 1: PO HEADER                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  📦 Project Name (locked, read-only)                         │  │
│  │     Main Street Apartments                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  📍 Delivery Address (locked, read-only)                     │  │
│  │     6986 South Odessa Street                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  🏢 Supplier                                                 │  │
│  │     [Auto-selected if single] or [Dropdown if multiple]     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  📅 Requested Delivery Date                                  │  │
│  │  🕐 Delivery Window: [ AM | PM | Any ]                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  💬 Notes (optional, voice input)                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│             ┌─────────────────────────────────────┐                │
│             │     Next - Add Items    →           │                │
│             └─────────────────────────────────────┘                │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                        SCREEN 2: ITEMS LIST                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Items (3)                                                    │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ 2x4x8 SPF Stud                    Qty: 100 EA    [Edit] [X]  │  │
│  │ 1/2" OSB Sheathing 4x8            Qty: 50 EA     [Edit] [X]  │  │
│  │ Simpson LUS28                     Qty: 24 EA     [Edit] [X]  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│                ┌─────────────────────────┐                         │
│                │      + Add Item         │                         │
│                └─────────────────────────┘                         │
│                                                                    │
│             ┌─────────────────────────────────────┐                │
│             │     Review PO    →                  │                │
│             └─────────────────────────────────────┘                │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                      SCREEN 3: REVIEW + SUBMIT                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Project: Main Street Apartments                              │  │
│  │ Supplier: Supplier_Test                                      │  │
│  │ Delivery: Jan 15, 2026 (AM)                                  │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ 3 Items                                          [Edit]      │  │
│  │ • 2x4x8 SPF Stud - 100 EA                                    │  │
│  │ • 1/2" OSB Sheathing - 50 EA                                 │  │
│  │ • Simpson LUS28 - 24 EA                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│    ┌─────────────────┐   ┌──────────────────────────────────┐      │
│    │  + Add More     │   │       Submit PO                  │      │
│    └─────────────────┘   └──────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────────┘
```

### Product Picker Flow (Modal/Sheet)

```text
STEP A: Main Category (2-column tile grid)
┌─────────────┐  ┌─────────────┐
│  HARDWARE   │  │  FRAMING    │
│   791 items │  │   LUMBER    │
└─────────────┘  └─────────────┘
┌─────────────┐  ┌─────────────┐
│  DECKING    │  │ ENGINEERED  │
│   104 items │  │   WOOD      │
└─────────────┘  └─────────────┘
       ↓ Tap → Auto-advance

STEP B: Secondary Category (vertical list)
┌──────────────────────────────────────┐
│ DECK BOARDS                      52  │
│ RAILING                          28  │
│ ACCESSORIES                      24  │
└──────────────────────────────────────┘
       ↓ Tap → Auto-advance
       ↓ If only 1 option → auto-select

STEP C: Spec Filters (chips with counts)
┌──────────────────────────────────────┐
│ Decking > Deck Boards            [X] │
├──────────────────────────────────────┤
│ Dimension                            │
│ [1x6] [5/4x6] [2x6] [All]            │
│                                      │
│ Color                                │
│ [Cedar] [Gray] [Teak] [All]          │
│                                      │
│ Length                               │
│ [12ft] [16ft] [20ft] [All]           │
└──────────────────────────────────────┘
       ↓ Each chip tap → Refine products shown

STEP D: Product List
┌──────────────────────────────────────┐
│ 🔍 Search (collapsed, tap to open)   │
├──────────────────────────────────────┤
│ ┌────────────────────────────────┐   │
│ │ Trex Select 1x6x12 Cedar       │   │
│ │ SKU: TREX-1612-CED             │   │
│ │ 1 in. x 6 in. | 12 ft.         │   │
│ └────────────────────────────────┘   │
│       ↓ Tap → Quantity Panel         │
└──────────────────────────────────────┘

QUANTITY PANEL (bottom sheet)
┌──────────────────────────────────────┐
│ Trex Select 1x6x12 Cedar             │
│ 1 in. x 6 in. | 12 ft.               │
├──────────────────────────────────────┤
│         [ - ]   24   [ + ]           │
│                                      │
│      Unit: [EACH] / [BUNDLE]         │
│                                      │
│      Notes: ________________         │
├──────────────────────────────────────┤
│         [ Add to PO ]                │
└──────────────────────────────────────┘
```

---

## Files to Create

### 1. `src/components/po-wizard-v2/POWizardV2.tsx`
Main dialog controller with 3-screen flow

### 2. `src/components/po-wizard-v2/HeaderScreen.tsx`
Screen 1: Project (read-only), address, supplier, delivery date/window, notes

### 3. `src/components/po-wizard-v2/ItemsScreen.tsx`
Screen 2: Items list with add/edit/remove actions

### 4. `src/components/po-wizard-v2/ReviewScreen.tsx`
Screen 3: Summary with submit action

### 5. `src/components/po-wizard-v2/ProductPicker.tsx`
Full-screen modal for category-guided product selection

### 6. `src/components/po-wizard-v2/CategoryGrid.tsx`
2-column tile grid for main categories

### 7. `src/components/po-wizard-v2/SecondaryCategoryList.tsx`
Vertical list with counts for secondary categories

### 8. `src/components/po-wizard-v2/SpecFilters.tsx`
Dynamic filter chips based on category

### 9. `src/components/po-wizard-v2/ProductList.tsx`
Product cards with optional search

### 10. `src/components/po-wizard-v2/QuantityPanel.tsx`
Bottom sheet for quantity selection

### 11. `src/types/poWizardV2.ts`
Updated types for new data structure

---

## Files to Modify

### `src/components/project/PurchaseOrdersTab.tsx`
- Update imports to use new `POWizardV2`
- Pass `initialProjectAddress` from project data

---

## Data Model Updates

### Updated POWizardData Type

```typescript
export interface POWizardV2Data {
  // Header (Screen 1)
  project_id: string;           // Required, locked
  project_name: string;         // Read-only display
  delivery_address: string;     // Auto-filled from project
  supplier_id: string | null;   // Auto-selected or dropdown
  supplier_name?: string;
  requested_delivery_date: Date | null;
  delivery_window: 'AM' | 'PM' | 'ANY';
  notes: string;

  // Items (Screen 2)
  line_items: POWizardV2LineItem[];
}

export interface POWizardV2LineItem {
  catalog_item_id: string;
  product_id?: string;
  supplier_sku: string;
  name: string;
  specs: string;              // "1x6 | 12ft | Cedar"
  quantity: number;
  unit_mode: 'EACH' | 'BUNDLE';
  bundle_count?: number;      // Only if bundle mode
  item_notes?: string;
}
```

---

## Category Mapping

Based on the spec, map database categories to display tiles:

| Display Name | DB Category | Has Secondary? |
|--------------|-------------|----------------|
| HARDWARE | Hardware | Yes - skip to products |
| FRAMING LUMBER | Dimensional | Yes (STUDS, DIMENSION, etc.) |
| FINISH LUMBER | Dimensional | Yes (secondary_category filters) |
| EXTERIOR TRIM | Exterior | Optional |
| DECKING | Decking | Yes (DECK BOARDS, RAILING, etc.) |
| ENGINEERED WOOD | Engineered | Yes (LVL, LSL, I-JOISTS, etc.) |
| SHEATING & PLYWOOD | Sheathing | Yes (OSB, CDX, etc.) |
| DRYWALL | Other | Filter by secondary |
| STRUCTURAL STEEL | Structural | Skip to products |

Note: Current catalog only has 4 categories with data (Hardware, Other, Decking, Engineered). The UI will only show tiles for categories with actual products.

---

## Spec Filter Priority by Category

Implement dynamic filter rendering based on category:

```typescript
const SPEC_PRIORITY: Record<string, string[]> = {
  Decking: ['dimension', 'color', 'length'],
  Dimensional: ['dimension', 'length', 'wood_species'],
  Engineered: ['dimension'],
  Sheathing: ['thickness', 'dimension'],
  Hardware: [],  // Skip to product list
};
```

---

## Supplier Handling Rules

1. **0 suppliers on project**: Block wizard with error message
2. **1 supplier on project**: Auto-select and lock (no dropdown)
3. **Multiple suppliers**: Show dropdown with only project suppliers

```typescript
// In HeaderScreen.tsx
if (projectSuppliers.length === 0) {
  return (
    <Card className="border-destructive">
      <AlertTriangle />
      No supplier assigned to this project.
      Contact your project manager.
    </Card>
  );
}

if (projectSuppliers.length === 1) {
  // Auto-fill, show locked state
  return <LockedSupplierCard supplier={projectSuppliers[0]} />;
}

// Multiple suppliers - show Select dropdown
return <Select options={projectSuppliers} />;
```

---

## Mobile-First Design Requirements

All interactive elements:
- Minimum 44px touch targets
- Large quantity steppers (+/-) at 48px
- Category tiles: 100px height minimum
- Bottom sticky actions for primary buttons
- No horizontal scrolling
- Sheet/modal transitions instead of page navigation
- Voice input button for notes

---

## Zero-Result Prevention

1. **Category tiles**: Only render if `count > 0`
2. **Secondary category list**: Filter out zero-count items
3. **Spec filter chips**: Show counts, hide if 0
4. **Fallback**: If filters result in 0 products, show "Clear Last Filter" button

```typescript
// In SpecFilters.tsx
const availableFilters = specs.filter(spec => 
  getProductCount(category, secondaryCategory, spec) > 0
);
```

---

## Database Queries Needed

### 1. Get category counts for tiles
```sql
SELECT category, COUNT(*) as count 
FROM catalog_items 
WHERE supplier_id = $supplier_id
GROUP BY category
```

### 2. Get secondary category counts
```sql
SELECT secondary_category, COUNT(*) as count 
FROM catalog_items 
WHERE supplier_id = $supplier_id 
  AND category = $category
  AND secondary_category IS NOT NULL
GROUP BY secondary_category
ORDER BY count DESC
```

### 3. Get spec values with counts
```sql
SELECT dimension, COUNT(*) as count
FROM catalog_items
WHERE category = $category 
  AND secondary_category = $secondary
GROUP BY dimension
```

---

## Implementation Steps

### Phase 1: Core Structure
1. Create `src/components/po-wizard-v2/` folder
2. Implement `POWizardV2.tsx` with 3-screen state machine
3. Create `types/poWizardV2.ts` with updated interfaces
4. Implement `HeaderScreen.tsx` with locked fields

### Phase 2: Product Picker
5. Create `ProductPicker.tsx` as full-screen modal
6. Implement `CategoryGrid.tsx` with dynamic tiles
7. Create `SecondaryCategoryList.tsx` with counts
8. Build `SpecFilters.tsx` with chip-based filtering
9. Create `ProductList.tsx` with search fallback
10. Implement `QuantityPanel.tsx` as bottom sheet

### Phase 3: Integration
11. Implement `ItemsScreen.tsx` with edit/delete
12. Create `ReviewScreen.tsx` with summary
13. Update `PurchaseOrdersTab.tsx` to use new wizard
14. Add project address to wizard props

### Phase 4: Polish
15. Add toast notifications ("Item added")
16. Implement voice input for notes
17. Add loading states and error handling
18. Test on mobile viewport

---

## Technical Details

### Supabase Queries

The wizard will use these queries:

```typescript
// Get project suppliers (existing RLS policy now allows this)
const { data: teamData } = await supabase
  .from('project_team')
  .select('org_id')
  .eq('project_id', projectId)
  .eq('role', 'Supplier');

const { data: suppliers } = await supabase
  .from('suppliers')
  .select('id, name, supplier_code')
  .in('organization_id', orgIds);

// Get categories with counts for tiles
const { data: categories } = await supabase
  .from('catalog_items')
  .select('category')
  .eq('supplier_id', supplierId);

// Aggregate counts client-side for now (or create RPC)
```

### State Management

Screen navigation with local state:

```typescript
type Screen = 'header' | 'items' | 'review';
type PickerStep = 'category' | 'secondary' | 'specs' | 'products' | 'quantity';

const [screen, setScreen] = useState<Screen>('header');
const [pickerOpen, setPickerOpen] = useState(false);
const [pickerStep, setPickerStep] = useState<PickerStep>('category');
```

---

## Validation Rules

1. PO must have at least 1 item before submit
2. Quantity must be > 0
3. Bundle mode only allowed when `bundle_type` exists on product
4. Supplier must be selected (auto or manual)
5. Delivery date required

