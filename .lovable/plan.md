
# Plan: Purchase Order Creation Wizard for TC and GC

## Design Philosophy

**Field-First, Minimal Typing**: Users are on construction sites with limited time and dirty hands. Every step should maximize tappable options and minimize keyboard input.

## Wizard Flow Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                    PO CREATION WIZARD                           │
│                     (5 Steps Total)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: SUPPLIER           ← Tap to select from list          │
│  ─────────────────                                              │
│  [ABC Lumber Supply]  [Home Depot Pro]  [Simpson Strong-Tie]   │
│  Recent suppliers shown first, tappable cards                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 2: PROJECT/CONTEXT    ← Tap project or work order        │
│  ─────────────────────                                          │
│  [Project: Oak Ridge Townhomes]                                 │
│  [Work Order: 1st Floor Framing]  (optional)                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 3: ADD ITEMS          ← Category chips + search           │
│  ──────────────────                                             │
│  [Lumber] [Hardware] [Sheathing] [Fasteners] ...               │
│                                                                 │
│  Search: "2x4 stud" ─→ Quick add with stepper                   │
│                                                                 │
│  ┌─────────────────────────────────────┐                        │
│  │ 2x4x92-5/8" STUD HEM FIR           │                        │
│  │ SKU: 2492HF  |  [−] 50 [+]  EA     │                        │
│  └─────────────────────────────────────┘                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 4: NOTES (Optional)   ← Voice-to-text button             │
│  ─────────────────────                                          │
│  [🎤 Tap to speak]  OR type notes                               │
│  "Deliver to back gate, call 555-1234"                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 5: REVIEW & CREATE    ← Summary + Create button           │
│  ────────────────────                                           │
│  Supplier: ABC Lumber                                           │
│  Project: Oak Ridge Townhomes                                   │
│  Items: 5 line items                                            │
│                                                                 │
│  [ Save as Draft ]  [ Create & Send Later ]                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Design

### Step 1: Select Supplier (Tap-First)

**Goal**: One tap to select supplier

**UI Elements**:
- **Recent Suppliers**: Show 3 most-recently-used suppliers as large tappable cards
- **All Suppliers List**: Scrollable list below with search filter
- **Quick Search**: Filter as you type (but optional)

```text
┌─────────────────────────────────────────┐
│         Select Supplier                 │
│         Who are you ordering from?      │
│                                         │
│  ─── Recently Used ───                  │
│  ┌─────────────┐  ┌─────────────┐       │
│  │ ABC Lumber  │  │ Simpson     │       │
│  │  ✓ Selected │  │ Strong-Tie  │       │
│  └─────────────┘  └─────────────┘       │
│                                         │
│  ─── All Suppliers ───                  │
│  [🔍 Search suppliers...]               │
│  ┌─────────────────────────────────┐    │
│  │ Home Depot Pro                  │    │
│  │ supplier_code: HDP-001          │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ Lowes                           │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

### Step 2: Select Project/Context (Tap-First)

**Goal**: Link PO to project and optionally work order

**UI Elements**:
- **Active Projects**: Tappable cards showing recent/active projects
- **Work Order (Optional)**: Once project selected, show associated work orders

```text
┌─────────────────────────────────────────┐
│         What's this for?                │
│                                         │
│  ─── Select Project ───                 │
│  ┌─────────────────────────────────┐    │
│  │ 🏗️ Oak Ridge Townhomes         │    │
│  │ 123 Oak St • Active             │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 🏗️ Maple Street Renovation     │    │
│  │ 456 Maple Ave • Active          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─── Link to Work Order (Optional) ─── │
│  ┌─────────────────────────────────┐    │
│  │ 1st Floor Framing               │    │
│  │ Unit 101                         │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ Skip - General Project Order    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

### Step 3: Add Items (Category-First Search)

**Goal**: Fastest path from category to item to cart

**UI Elements**:
- **Category Chips**: Large tappable chips for common categories
- **Smart Search**: Typeahead search when user knows item
- **Quick Add**: +/- stepper directly on search results
- **Cart Summary**: Running count of items at bottom

```text
┌─────────────────────────────────────────┐
│         Add Items                       │
│         Tap category or search          │
│                                         │
│  ┌────────┐ ┌────────┐ ┌────────────┐   │
│  │ Lumber │ │Hardware│ │ Sheathing  │   │
│  └────────┘ └────────┘ └────────────┘   │
│  ┌────────┐ ┌────────┐ ┌────────────┐   │
│  │Fastener│ │Decking │ │ Engineered │   │
│  └────────┘ └────────┘ └────────────┘   │
│                                         │
│  [🔍 Search "2x4 stud hem fir"...]      │
│                                         │
│  ─── Results ───                        │
│  ┌─────────────────────────────────┐    │
│  │ 2x4x92-5/8" STUD HEM FIR        │    │
│  │ SKU: 2492HF                     │    │
│  │           [−]  50  [+]   EA     │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 2x4x8' HEM FIR                  │    │
│  │ SKU: 248HF                      │    │
│  │           [−]  0   [+]   EA     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─────────────────────────────────────  │
│  │ 📦 Cart: 3 items                │    │
│  │ [View Cart]                     │    │
│  ─────────────────────────────────────  │
└─────────────────────────────────────────┘
```

**Cart Sheet** (when tapped):
```text
┌─────────────────────────────────────────┐
│         Items in Order                  │
│                                         │
│  2x4x92-5/8" STUD HEM FIR    50 EA  [🗑]│
│  OSB 7/16" 4x8              100 EA  [🗑]│
│  LUS26 Joist Hanger          24 EA  [🗑]│
│                                         │
│  [+ Add More Items]                     │
└─────────────────────────────────────────┘
```

---

### Step 4: Notes (Voice-Friendly)

**Goal**: Capture delivery instructions with minimal typing

**UI Elements**:
- **Quick Chips**: Common notes as tappable chips
- **Voice Input**: Large microphone button for speech-to-text
- **Optional Skip**: Notes are not required

```text
┌─────────────────────────────────────────┐
│         Delivery Notes                  │
│         Optional instructions           │
│                                         │
│  ─── Quick Add ───                      │
│  ┌──────────────┐ ┌────────────────┐    │
│  │ Call before  │ │ Deliver to     │    │
│  │ delivery     │ │ back gate      │    │
│  └──────────────┘ └────────────────┘    │
│  ┌──────────────┐ ┌────────────────┐    │
│  │ Forklift     │ │ Leave on       │    │
│  │ required     │ │ driveway       │    │
│  └──────────────┘ └────────────────┘    │
│                                         │
│  ─── Or Speak ───                       │
│       ┌─────────────────┐               │
│       │       🎤        │               │
│       │  Tap to speak   │               │
│       └─────────────────┘               │
│                                         │
│  ─── Or Type ───                        │
│  ┌─────────────────────────────────┐    │
│  │ Additional notes...             │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Skip]                                 │
└─────────────────────────────────────────┘
```

---

### Step 5: Review & Create

**Goal**: Quick confirmation before creating PO

**UI Elements**:
- **Summary Cards**: Supplier, project, item count
- **Item Preview**: Collapsible list of items
- **Action Buttons**: Save Draft vs Create

```text
┌─────────────────────────────────────────┐
│         Review Order                    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🏪 Supplier                     │    │
│  │ ABC Lumber Supply               │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 🏗️ Project                      │    │
│  │ Oak Ridge Townhomes             │    │
│  │ Work Order: 1st Floor Framing   │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 📦 Items                        │    │
│  │ 3 line items                    │    │
│  │ [▼ View Details]                │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 📝 Notes                        │    │
│  │ "Call before delivery"          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      [ Save as Draft ]          │    │
│  │      [ Create PO ]              │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## Technical Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/po-wizard/POWizard.tsx` | Main wizard dialog component |
| `src/components/po-wizard/WizardProgress.tsx` | Reuse existing pattern from work-order-wizard |
| `src/components/po-wizard/steps/SupplierStep.tsx` | Supplier selection step |
| `src/components/po-wizard/steps/ProjectStep.tsx` | Project/work order context selection |
| `src/components/po-wizard/steps/ItemsStep.tsx` | Category-first item picker with cart |
| `src/components/po-wizard/steps/NotesStep.tsx` | Voice-friendly notes input |
| `src/components/po-wizard/steps/ReviewStep.tsx` | Summary and create button |
| `src/components/po-wizard/index.ts` | Export barrel file |
| `src/types/poWizard.ts` | Type definitions for wizard state |

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/PurchaseOrders.tsx` | Add button to open wizard |
| `src/components/project/PurchaseOrdersTab.tsx` | Enable "Create PO" button to open wizard |

### Type Definitions (`src/types/poWizard.ts`)

```typescript
export interface POWizardLineItem {
  catalog_item_id: string;
  supplier_sku: string;
  description: string;
  quantity: number;
  uom: string;
  pieces?: number;
  length_ft?: number;
}

export interface POWizardData {
  // Step 1
  supplier_id: string | null;
  supplier_name?: string;

  // Step 2
  project_id: string | null;
  project_name?: string;
  work_item_id: string | null;
  work_item_title?: string;

  // Step 3
  line_items: POWizardLineItem[];

  // Step 4
  notes: string;
}

export const INITIAL_PO_WIZARD_DATA: POWizardData = {
  supplier_id: null,
  project_id: null,
  work_item_id: null,
  line_items: [],
  notes: '',
};

export const QUICK_NOTES = [
  'Call before delivery',
  'Deliver to back gate',
  'Forklift required',
  'Leave on driveway',
  'Contact site super',
  'Morning delivery only',
];
```

### Database Operations

**Create PO Flow**:
1. Generate PO number via `generate_po_number` RPC
2. Insert into `purchase_orders` table
3. Bulk insert line items into `po_line_items`
4. Return new PO for navigation/confirmation

```typescript
const createPurchaseOrder = async (data: POWizardData, orgId: string) => {
  // Generate PO number
  const { data: poNumber } = await supabase.rpc('generate_po_number', {
    org_id: orgId,
  });

  // Create PO
  const { data: newPO, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      organization_id: orgId,
      po_number: poNumber,
      po_name: `PO for ${data.project_name || 'Materials'}`,
      supplier_id: data.supplier_id,
      project_id: data.project_id,
      work_item_id: data.work_item_id,
      notes: data.notes || null,
      status: 'DRAFT',
    })
    .select()
    .single();

  if (poError) throw poError;

  // Insert line items
  const lineItems = data.line_items.map((item, idx) => ({
    po_id: newPO.id,
    line_number: idx + 1,
    supplier_sku: item.supplier_sku,
    description: item.description,
    quantity: item.quantity,
    uom: item.uom,
    pieces: item.pieces,
    length_ft: item.length_ft,
  }));

  if (lineItems.length > 0) {
    await supabase.from('po_line_items').insert(lineItems);
  }

  return newPO;
};
```

---

## Mobile Optimization Details

### Touch Targets
- All buttons minimum 44x44px tap target
- Large category chips (full width on mobile)
- Quantity steppers with large +/- buttons

### Gesture Support
- Swipe to delete items from cart
- Pull to refresh on lists

### Input Optimization
- Input type="tel" for quantity fields (numeric keyboard)
- Debounced search (300ms) to reduce API calls
- Voice input via Web Speech API for notes

### Viewport Considerations
- Sheet slides up from bottom on mobile
- Sticky footer with navigation buttons
- Scroll snap for category selection
