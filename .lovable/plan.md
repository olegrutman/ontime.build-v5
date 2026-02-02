
# Dual Quantity Entry for Engineered Lumber + Smart Bundle/Pallet Logic

## Overview

Two enhancements to the QuantityPanel for construction ordering:

1. **Engineered Lumber**: Capture both **linear feet (LF)** and **pieces** since these products are priced by LF but ordered by piece count
2. **Bundle/Pallet Smart Logic**: When selecting a bundle, pre-fill with bundle quantity, allow adjustment, and auto-switch to "EACH" if modified

---

## Current Behavior

```text
Quantity Panel
┌──────────────────────────────────────┐
│  Product: LVL 11-7/8 Header          │
│                                      │
│  Quantity:  [ - ]  4  [ + ]          │
│                                      │
│  Unit: [Each (EA)] [Bundle (48)]     │
└──────────────────────────────────────┘
```

**Problems:**
- Engineered lumber needs length entry (e.g., "4 pieces at 12 ft each = 48 LF")
- Bundle button switches mode but doesn't pre-fill the bundle quantity
- No way to order "48 pieces" without knowing if it's a full bundle

---

## Proposed UX

### For Engineered Lumber (LVL, LSL, I-Joists, Glulam, Rim Board)

```text
Quantity Panel
┌──────────────────────────────────────┐
│  LVL 11-7/8 Header /LF               │
│  SKU: LVL1178                        │
│                                      │
│  How many pieces?                    │
│         [ - ]   4   [ + ]            │
│                                      │
│  Length each (ft)                    │
│         [ - ]  12   [ + ]            │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  Total: 48 LF (4 pcs @ 12')  │    │
│  └──────────────────────────────┘    │
│                                      │
│  Notes (optional): ___________       │
│                                      │
│         [ Add to PO ]                │
└──────────────────────────────────────┘
```

**Logic:**
- Detect engineered products by `category === 'Engineered'`
- Show dual entry: Pieces + Length (ft)
- Display calculated total LF
- Store: `quantity` = pieces, `length_ft` = length, `computed_lf` = total

---

### For Bundle/Pallet/Box Products

**Current:** Two buttons "Each" vs "Bundle"

**New:** Single smart flow

```text
Quantity Panel
┌──────────────────────────────────────┐
│  2x4x8 SPF Stud                      │
│  SKU: 2480                           │
│                                      │
│  How do you want to order?           │
│  ┌────────────────────────────────┐  │
│  │  ● Bundle of 294               │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  ○ Individual Pieces           │  │
│  └────────────────────────────────┘  │
│                                      │
│  Quantity:                           │
│         [ - ]  294  [ + ]            │
│                      ↑               │
│              Pre-filled from bundle  │
│                                      │
│  ────────────────────────────────    │
│  ⓘ Ordering as: Bundle (294 pcs)    │
│  ────────────────────────────────    │
│                                      │
│         [ Add to PO ]                │
└──────────────────────────────────────┘
```

**Smart Logic:**
1. User selects "Bundle of 294" → quantity auto-fills to 294
2. If user keeps 294 → save as `unit_mode: 'BUNDLE'`
3. If user changes to 295 or 290 → auto-switch to `unit_mode: 'EACH'`
4. Status message updates: "Ordering as: 295 pieces (modified from bundle)"

---

## Technical Implementation

### 1. Update Types (`src/types/poWizardV2.ts`)

Add new fields to `POWizardV2LineItem`:

```typescript
export interface POWizardV2LineItem {
  id: string;
  catalog_item_id: string;
  supplier_sku: string;
  name: string;
  specs: string;
  quantity: number;           // Pieces for engineered, total units otherwise
  unit_mode: 'EACH' | 'BUNDLE';
  bundle_count?: number;      // Only if unit_mode is BUNDLE
  bundle_name?: string;       // "Bundle", "Pallet", "Box"
  item_notes?: string;
  uom: string;
  
  // NEW: For engineered lumber
  length_ft?: number;         // Length per piece in feet
  computed_lf?: number;       // Total linear feet (quantity * length_ft)
  is_engineered?: boolean;    // Flag for display purposes
}
```

### 2. Update `CatalogProduct` interface

No changes needed - already has `category` for detection.

### 3. Refactor `QuantityPanel.tsx`

Major refactor to handle three modes:
- **Standard mode**: Simple quantity stepper
- **Engineered mode**: Pieces + Length dual entry
- **Bundle mode**: Smart bundle/each toggle with auto-detection

```typescript
interface QuantityPanelProps {
  product: CatalogProduct;
  onAdd: (item: POWizardV2LineItem) => void;
  onClose: () => void;
}

// Detection
const isEngineered = product.category === 'Engineered';
const hasBundle = !!product.bundle_type && !!product.bundle_qty;

// State for engineered
const [pieces, setPieces] = useState(1);
const [lengthFt, setLengthFt] = useState(12); // Default 12 ft
const computedLf = pieces * lengthFt;

// State for bundle
const [orderMode, setOrderMode] = useState<'bundle' | 'each'>(hasBundle ? 'bundle' : 'each');
const [quantity, setQuantity] = useState(hasBundle ? product.bundle_qty! : 1);
const bundleQty = product.bundle_qty || 0;

// Smart detection: if quantity matches bundle, it's a bundle
const isFullBundle = hasBundle && quantity === bundleQty && orderMode === 'bundle';
```

### 4. Handle Add Logic

```typescript
const handleAdd = () => {
  if (isEngineered) {
    // Engineered lumber
    const item: POWizardV2LineItem = {
      id: crypto.randomUUID(),
      catalog_item_id: product.id,
      supplier_sku: product.supplier_sku,
      name: product.name || product.description,
      specs: formatSpecs(),
      quantity: pieces,
      unit_mode: 'EACH',
      uom: 'EA',
      length_ft: lengthFt,
      computed_lf: computedLf,
      is_engineered: true,
      item_notes: notes || undefined,
    };
    onAdd(item);
  } else {
    // Standard or Bundle
    const item: POWizardV2LineItem = {
      id: crypto.randomUUID(),
      catalog_item_id: product.id,
      supplier_sku: product.supplier_sku,
      name: product.name || product.description,
      specs: formatSpecs(),
      quantity,
      unit_mode: isFullBundle ? 'BUNDLE' : 'EACH',
      bundle_count: isFullBundle ? bundleQty : undefined,
      bundle_name: isFullBundle ? product.bundle_type : undefined,
      uom: product.uom_default,
      item_notes: notes || undefined,
    };
    onAdd(item);
  }
  onClose();
};
```

### 5. Update `ItemsScreen.tsx` Display

Show engineered lumber with LF total:

```typescript
// In ItemsScreen item display
<Badge variant="outline">
  {item.is_engineered && item.length_ft
    ? `${item.quantity} pcs @ ${item.length_ft}' = ${item.computed_lf} LF`
    : `${item.quantity} ${item.unit_mode === 'BUNDLE' ? item.bundle_name || 'BDL' : item.uom}`
  }
</Badge>
```

### 6. Update `ReviewScreen.tsx` Display

Same display logic for the review screen.

---

## UI Component Breakdown

### Engineered Lumber Panel

```text
┌────────────────────────────────────────────┐
│ PRODUCT SUMMARY                            │
├────────────────────────────────────────────┤
│                                            │
│ How many pieces?                           │
│ ┌────────────────────────────────────────┐ │
│ │   [ - ]        4         [ + ]         │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Length per piece (ft)                      │
│ ┌────────────────────────────────────────┐ │
│ │   [ - ]       12         [ + ]         │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ 📐 Total: 48 Linear Feet               │ │
│ │    (4 pieces × 12 ft each)             │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Notes (optional): ___________________      │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │           ✓ Add to PO                  │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### Bundle/Each Selection Panel

```text
┌────────────────────────────────────────────┐
│ PRODUCT SUMMARY                            │
├────────────────────────────────────────────┤
│                                            │
│ Order as:                                  │
│ ┌────────────────────────────────────────┐ │
│ │ ◉ Bundle of 294                        │ │
│ └────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────┐ │
│ │ ○ Individual Pieces                    │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Quantity:                                  │
│ ┌────────────────────────────────────────┐ │
│ │   [ - ]       294        [ + ]         │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ 📦 Ordering: 1 Bundle (294 pieces)     │ │
│ └────────────────────────────────────────┘ │
│                                 OR         │
│ ┌────────────────────────────────────────┐ │
│ │ ⚠️ Modified: 295 pieces (not a bundle) │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Notes (optional): ___________________      │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │           ✓ Add to PO                  │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/poWizardV2.ts` | Add `length_ft`, `computed_lf`, `is_engineered` to `POWizardV2LineItem` |
| `src/components/po-wizard-v2/QuantityPanel.tsx` | Complete rewrite with three modes |
| `src/components/po-wizard-v2/ItemsScreen.tsx` | Update badge display for engineered items |
| `src/components/po-wizard-v2/ReviewScreen.tsx` | Update item display for engineered items |

---

## Validation Rules

1. **Engineered lumber:**
   - Pieces must be >= 1
   - Length must be >= 1 ft
   - Maximum length: 60 ft (reasonable beam length)

2. **Bundle mode:**
   - If quantity differs from bundle_qty, auto-save as EACH
   - Multiple bundles: If quantity is exact multiple of bundle_qty, calculate bundles count

3. **General:**
   - Quantity must be >= 1
   - Notes are optional

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User selects Bundle, then changes qty | Auto-switch to EACH, show warning |
| User orders exactly 2x bundle qty | Could show "2 Bundles" - optional enhancement |
| Engineered product with no length entered | Default to 12 ft, require confirmation |
| Product has bundle but user picks EACH | Start with qty = 1, not bundle qty |

---

## Summary

This enhancement enables:
- **Engineered lumber ordering** with proper pieces + length tracking for accurate LF calculation
- **Smart bundle detection** that pre-fills quantities and automatically tracks whether the order matches a full bundle
- **Clear feedback** showing "Bundle" vs "Modified from bundle" vs "Individual pieces"
