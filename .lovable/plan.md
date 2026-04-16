

# Redesign All Document Downloads to Match v3 Form Prototypes

## Summary
Replace the current generic HTML templates in all 5 download edge functions with the professional "Ontime.Build Form Prototypes v3" design language. This includes the branded header with company logo + navy border, Barlow Condensed/IBM Plex Mono/DM Sans typography, structured section cards with colored dots, refined totals boxes with navy grand-total row, signature blocks, approval workflow visualization, and the "Powered by Ontime.build" footer with document tags.

## Design System (from prototype)

**Colors**: Navy `#1a3b6e`, Amber `#F5A623`, Surface `#FFFFFF`, Surface2 `#F7F9FC`, Border `#E4E8F0`, Ink `#0F1923`, Muted `#5A6A7E`, Faint `#9AAABB`, Green `#059669`, Red `#DC2626`, Teal `#0D9488`, Blue `#2563EB`

**Typography**: `Barlow Condensed` (headings, doc type, totals grand), `IBM Plex Mono` (financial values, IDs), `DM Sans` (body text) — loaded via Google Fonts link

**Layout**: 8.5in page, `form-header` (logo+company left, doc type+ID+status right, 3px navy bottom border), `form-body` with sections (bordered cards, colored dot section titles), `totals-box` (270px right-aligned, navy grand row), `sig-row` (2-col signature lines), `form-footer` (Powered by Ontime.build + generated date + doc tag pills)

**Status badges**: Rounded pills — Draft (gray), Pending (amber), Submitted (teal), Approved (green)

## Changes — 5 Edge Functions

### 1. `invoice-download` — Match Invoice prototype
- Header: logo + company name/address left, "INVOICE" right with invoice number, status pill, created date
- 2×2 section grid: Project Details, Billing Period, From, To
- Schedule of Values table with teal "this period" and "% complete" columns
- Right-aligned totals box with navy grand total row
- Approval Workflow section (4-step: Submitted → GC Review → Approved → Paid)
- Signature row: Trade Contractor / GC Authorization
- Ontime.build footer with doc number + project name tags

### 2. `po-download` — Match Purchase Order prototype
- Header: logo + company left, "PURCHASE ORDER" right with PO number, status, ordered/ETA dates
- 2×2 sections: Project Details, Delivery (date+address), From (Buyer), To (Supplier)
- Order Items table with SKU, Description, Qty, Unit, Unit Price, Amount columns
- Bottom section: Delivery Instructions (dashed notes box) + Totals box (Subtotal, Delivery Fee, Tax, PO Total)
- Signature row: Buyer Authorization / Supplier Acknowledgment
- Ontime.build footer

### 3. `work-order-download` — Match Work Order prototype
- Header: logo + company left, "WORK ORDER" right with WO code, status, issued/start dates
- 2-col sections: Project Details (with building/level), Assignment (crew lead + workers)
- Schedule & Budget section: 4×2 field grid (Start Date, Target Completion, Est. Duration, Scope Category, Estimated Labor, Material PO Ref, Equipment Allowance, WO Not-to-Exceed with highlight)
- Scope of Work / Task Checklist table with checkboxes, task descriptions, est. hours, assigned, status
- Special Instructions notes box
- Signature row: GC Authorization / Trade Contractor Acceptance
- Ontime.build footer

### 4. `return-credit-memo` — Match consistent v3 styling
- Apply same header/footer/section patterns
- Keep existing credit memo data structure
- Add signature row and Ontime footer

### 5. `project-summary-download` — Match consistent v3 styling
- Apply same header/footer treatment
- Keep existing summary data structure

## Shared CSS
All 5 functions will embed the same base CSS (inlined in each HTML output since they're standalone documents). This includes the full v3 stylesheet covering: `form-header`, `form-body`, `section`, `sec-title`, `field-grid`, `line-table`, `totals-box`, `sig-row`, `form-footer`, `notes-box`, `approval-chain`, `delta-box` classes, plus Google Fonts import and print media query.

## Technical Details
- Google Fonts loaded via `<link>` tag in each HTML `<head>`
- Ontime.build SVG icon embedded inline in footer
- All financial values use `IBM Plex Mono` with `.mono` class
- Status badges use role-specific colors (`.st-draft`, `.st-submitted`, `.st-approved`, etc.)
- Page dimensions: `width: 8.5in; min-height: 11in` for print-ready output
- Print media query hides navigation, removes shadows, forces page breaks

## Files Modified
1. `supabase/functions/invoice-download/index.ts`
2. `supabase/functions/po-download/index.ts`
3. `supabase/functions/work-order-download/index.ts`
4. `supabase/functions/return-credit-memo/index.ts`
5. `supabase/functions/project-summary-download/index.ts`
6. New memory file: `mem://style/document-templates/v3-form-prototypes` — storing the design tokens and patterns

No database changes needed.

