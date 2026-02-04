
# Supplier-Only PDF Estimate Upload → Project Estimate Catalog + Packs

## Summary

I will build a feature that allows **only Suppliers** to upload a PDF estimate into a project. The system will:
1. Store the PDF file
2. Parse it into line items grouped by "Packs" (sections)
3. Let the Supplier review and match items to the product catalog
4. Create a **restricted product selection** so that when creating POs, users can only pick from estimate-approved products
5. Allow selecting a Pack to auto-populate a draft PO

**Primary Goal**: Prevent users from ordering the wrong product by restricting selection to estimate-approved products.

---

## Step-by-Step Implementation

### Step 1: Database Schema

Create new tables to support PDF uploads, parsed line items, and catalog mapping:

**Table: `estimate_pdf_uploads`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| estimate_id | uuid | FK to supplier_estimates |
| file_path | text | Storage path to PDF |
| file_name | text | Original file name |
| file_size | integer | File size in bytes |
| uploaded_by | uuid | User who uploaded |
| uploaded_at | timestamptz | Upload timestamp |

**Table: `estimate_line_items`** (parsed from PDF)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| estimate_id | uuid | FK to supplier_estimates |
| raw_text_line | text | Original text from PDF |
| description | text | Cleaned description |
| quantity | numeric (nullable) | Parsed quantity |
| uom | text (nullable) | Unit of measure |
| pack_name | text | Section heading (default: "Loose Estimate Items") |
| status | text | 'imported', 'needs_review', 'matched', 'unmatched' |
| catalog_item_id | uuid (nullable) | FK to catalog_items when matched |
| sort_order | integer | Display order |

**Table: `estimate_catalog_mapping`** (finalized approved products)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| estimate_id | uuid | FK to supplier_estimates |
| project_id | uuid | FK to projects |
| catalog_item_id | uuid | FK to catalog_items |
| line_item_id | uuid | FK to estimate_line_items |
| created_at | timestamptz | When mapping was created |

**Storage bucket**: `estimate-pdfs` for storing uploaded PDF files

---

### Step 2: PDF Upload UI (Supplier-Only)

**Location**: Within `SupplierProjectEstimates.tsx` detail sheet

**Changes**:
- Add "Upload PDF Estimate" button visible only to Supplier users
- Use Supabase Storage to upload PDF to `estimate-pdfs` bucket
- Create record in `estimate_pdf_uploads` table
- Display uploaded file info: name, upload date, uploaded by

**Permission check**: Already handled - `SupplierProjectEstimates.tsx` redirects non-suppliers at line 108

---

### Step 3: Edge Function for PDF Parsing

**New edge function**: `parse-estimate-pdf`

**Logic**:
1. Receive PDF file path and estimate_id
2. Download PDF from storage
3. Use Lovable AI (gemini-3-flash) to extract structured data:
   - Detect section headings (pack names)
   - Extract line items with description, quantity, unit
   - Flag uncertain items as `needs_review`
4. Insert parsed items into `estimate_line_items` table
5. Attempt catalog matching for each item:
   - **Priority 1**: Exact match on supplier_sku (if SKU text detected)
   - **Priority 2**: Fuzzy match on description + dimension fields
   - Mark as `matched` or `unmatched`

**Pack Detection Rules**:
- Headings like "Basement", "1st Floor Framing", "Garden Level" become pack_name
- Items following a heading belong to that pack until next heading
- If no heading detected, default to "Loose Estimate Items"

---

### Step 4: Supplier Review Screen

**New component**: `EstimateReviewTable.tsx`

**Features**:
- Editable table showing all parsed line items
- Columns: Pack Name, Description, Qty, Unit, Matched Product, Status
- Pack name dropdown (editable, can reassign)
- Description inline edit
- Qty/Unit inline edit
- Matched Product: catalog search picker to manually match
- Status badges: Imported, Needs Review, Matched, Unmatched
- "Finalize Estimate" button

**Finalize action**:
- Validates all items are matched or explicitly marked
- Creates records in `estimate_catalog_mapping` for all matched items
- Updates estimate status to 'SUBMITTED' or 'APPROVED' (supplier side ready)

---

### Step 5: Restricted Product Picker ("Pick from Estimate" Mode)

**Modified component**: `ProductPicker.tsx`

**Changes**:
- Add new prop: `restrictToEstimate?: { projectId: string; estimateId: string }`
- When prop is provided:
  - Query `estimate_catalog_mapping` for allowed product IDs
  - Filter catalog queries to only show those products
  - Show header: "Picking from Estimate: [Estimate Name]"
  - Remove category navigation (show flat list of approved products)

**This is the key safety feature**: When in estimate-restricted mode, the picker physically cannot show non-approved products.

---

### Step 6: Pack-Based PO Creation

**New component**: `EstimatePackList.tsx`

**Location**: Within estimate detail sheet (Supplier view) or project PO tab

**Features**:
- List unique pack_name values from `estimate_line_items`
- Show item count and status per pack
- "Create PO from Pack" button per pack
- Opens POWizardV2 pre-populated with:
  - All line items from that pack
  - Notes field: "Pack Order: [Pack Name]"
  - supplier_id auto-set from estimate's supplier

**PO data includes**:
- New fields on `purchase_orders` table: `source_pack_name`, `source_estimate_id`

---

### Step 7: Update PO Wizard to Support Estimate Mode

**Modified component**: `POWizardV2.tsx`

**New props**:
- `estimateId?: string` - When provided, restricts product selection
- `packName?: string` - Pre-populate from pack
- `initialItems?: POWizardV2LineItem[]` - Pre-fill items from pack

**Changes to ItemsScreen**:
- Pass `restrictToEstimate` to ProductPicker
- Show "Adding from Estimate" indicator
- User can still edit quantities, delete items, add extra items (from estimate catalog only)

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/XXXXX_estimate_pdf_tables.sql` | Create | New tables + storage bucket |
| `supabase/functions/parse-estimate-pdf/index.ts` | Create | PDF parsing edge function |
| `src/components/estimate/EstimatePDFUpload.tsx` | Create | Upload button + file info display |
| `src/components/estimate/EstimateReviewTable.tsx` | Create | Review/edit parsed line items |
| `src/components/estimate/EstimatePackList.tsx` | Create | Pack listing with PO creation |
| `src/components/estimate/CatalogItemPicker.tsx` | Create | Search picker for manual matching |
| `src/pages/SupplierProjectEstimates.tsx` | Modify | Add PDF upload + review UI in sheet |
| `src/components/po-wizard-v2/ProductPicker.tsx` | Modify | Add estimate restriction mode |
| `src/components/po-wizard-v2/POWizardV2.tsx` | Modify | Add estimate/pack props |
| `src/types/estimate.ts` | Modify | Add new type definitions |

---

## RLS Policies

**estimate_pdf_uploads**:
- Supplier org can INSERT/SELECT/DELETE own uploads
- Project participants can SELECT

**estimate_line_items**:
- Supplier org can INSERT/UPDATE/DELETE own items
- Project participants can SELECT

**estimate_catalog_mapping**:
- Supplier org can INSERT/DELETE own mappings
- Project participants can SELECT (needed for restricted picking)

---

## Technical Notes

1. **PDF Parsing**: Uses Lovable AI gateway with gemini-3-flash model (already used in `generate-work-order-description`)
2. **Storage**: Files stored in Supabase Storage, not database (per file storage policy)
3. **Matching Algorithm**: Will use `catalog_items.supplier_sku` and text similarity on `description` field
4. **Performance**: Catalog restriction query uses join on `estimate_catalog_mapping` to filter products

---

## Acceptance Test Coverage

| Test | Implementation |
|------|----------------|
| A) Supplier uploads PDF and sees it attached | PDF stored in storage, metadata in `estimate_pdf_uploads`, shown in UI |
| B) PDF imports line items with pack grouping | Edge function parses, creates `estimate_line_items` with pack_name |
| C) Supplier can correct items and match to catalog | `EstimateReviewTable` with inline editing and catalog picker |
| D) "Pick from Estimate" mode never shows non-estimate products | ProductPicker `restrictToEstimate` prop filters to mapping table |
| E) Selecting pack auto-populates PO and remains editable | `EstimatePackList` creates draft with items, user edits in wizard |
