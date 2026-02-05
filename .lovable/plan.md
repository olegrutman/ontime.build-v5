
# Build a Reliable PDF-to-Estimate Conversion Tool

## Overview

Currently, the estimate upload workflow only supports CSV files. When suppliers have PDF quotes (which is the most common format in construction), they must manually convert to CSV first -- leading to garbage data and broken estimates. This plan adds an AI-powered PDF upload option that uses Gemini's vision capabilities to extract structured line items directly from a PDF.

## How It Works

1. Supplier opens an estimate in DRAFT status and clicks "Upload PDF"
2. The PDF is uploaded to the existing `estimate-pdfs` storage bucket
3. A record is created in the existing `estimate_pdf_uploads` table
4. The PDF is sent to a new backend function (`parse-estimate-pdf`) which uses Gemini's vision model to extract structured line items (SKU, description, quantity, UOM, pack grouping)
5. Extracted items are returned to the frontend for review in the existing Pack Review and Catalog Match steps
6. On confirmation, items are saved to `supplier_estimate_items` as usual

## Architecture

The backend function will:
- Download the PDF from storage
- Convert each page to a base64 image
- Send the images to Gemini 2.5 Flash (multimodal) via Lovable AI Gateway with a structured extraction prompt
- Use tool calling to get reliable JSON output (SKU, description, qty, UOM, pack_name)
- Handle large PDFs by processing pages in batches
- Return structured data matching the existing `ParsedPack` format

## Files to Create

### 1. `supabase/functions/parse-estimate-pdf/index.ts` -- New backend function

- Accepts `{ estimateId, filePath }` in the request body
- Downloads the PDF from the `estimate-pdfs` storage bucket using the service role key
- Converts PDF pages to images using pdf.js (or sends raw PDF bytes as base64 to Gemini which supports PDF input natively)
- Calls Lovable AI Gateway (`google/gemini-2.5-flash`) with a structured prompt + tool calling to extract line items
- Returns `{ packs: [{ name, items: [{ supplier_sku, description, quantity, uom }] }], totalItems, warnings }` 
- Handles rate limits (429), payment required (402), and truncation gracefully
- For large PDFs that exceed token limits: processes in chunks and merges results

### 2. `src/components/estimate-upload/PdfUploadStep.tsx` -- New UI component

- Drag-and-drop or file-picker for PDF files (max 20MB)
- Upload progress indicator
- Calls the backend function and shows a processing spinner
- On success, passes parsed packs to the existing `PackReviewStep`
- On failure, shows clear error messages with suggestions (e.g., "Try splitting into smaller files")

## Files to Modify

### 3. `src/components/estimate-upload/EstimateUploadWizard.tsx`

- Add a new initial step: file type selector (CSV or PDF)
- When PDF is selected, show `PdfUploadStep` instead of the CSV file picker
- When CSV is selected, keep existing behavior
- Both paths converge at the `PackReviewStep` with the same `ParsedPack[]` data structure

### 4. `supabase/config.toml`

- Register the new `parse-estimate-pdf` function with `verify_jwt = false` (same as the existing work order description function)

## Technical Details

### AI Prompt Strategy

The backend function will use Gemini's tool calling (not raw JSON output) for reliability:

```
Tool: extract_estimate_items
Parameters:
  packs: array of {
    name: string (section/pack heading from the document),
    items: array of {
      supplier_sku: string,
      description: string,
      quantity: number,
      uom: string (EA, PC, LF, BDL, etc.)
    }
  }
```

The system prompt will instruct the model to:
- Identify section headings as pack names
- Extract only material line items (skip headers, footers, totals, tax lines, page numbers)
- Normalize SKUs (strip whitespace, uppercase)
- Detect UOM from context if not in a dedicated column
- Ignore pricing columns entirely (pricing is handled separately)

### PDF Input

Gemini 2.5 Flash natively accepts PDF files as base64 input (up to ~30 pages). The function will:
- Read the PDF from storage as a buffer
- Convert to base64
- Send as an inline document part with `mime_type: "application/pdf"`
- For PDFs over 30 pages, split into batches and merge the extracted packs

### Error Handling

- If AI extraction returns zero items: show "Could not extract items from this PDF. Try a cleaner scan or use CSV upload."
- If the PDF is too large: suggest splitting into sections
- Rate limit (429) and payment (402) errors are surfaced as toast messages
- Partial results from truncated responses are salvaged using JSON repair logic

### Existing Infrastructure Used

- Storage bucket: `estimate-pdfs` (already exists, private, with RLS policies)
- Upload tracking: `estimate_pdf_uploads` table (already exists with proper RLS)
- Item storage: `supplier_estimate_items` table (no changes needed)
- Catalog matching: `CatalogMatchStep` component (reused as-is)
- Pack review: `PackReviewStep` component (reused as-is)

### No Database Migrations Needed

All required tables and storage buckets already exist. The only infrastructure change is registering the new function in `config.toml`.
