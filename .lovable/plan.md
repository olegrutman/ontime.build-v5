

# Make Create Invoice Button Always Visible (Sticky Footer)

## Problem
When creating a new invoice, the "Create Invoice" and "Cancel" buttons are inside the scrollable dialog content. On long forms (many SOV line items), users must scroll all the way to the bottom to find the action buttons. This is a poor UX on both desktop and mobile.

## Solution
Make the `DialogFooter` in both invoice creation dialogs sticky at the bottom of the dialog, so the action buttons are always visible regardless of scroll position. This follows best practice for long forms in modals.

## Changes

### File: `src/components/invoices/CreateInvoiceFromSOV.tsx`
- Restructure the `DialogContent` so the scrollable area only wraps the form content (header + body), not the footer
- Remove `overflow-y-auto` from `DialogContent` and instead wrap the form body in its own scrollable container
- Make the `DialogFooter` sticky with a top border and background so it stays pinned at the bottom with a visual separator

### File: `src/components/invoices/CreateInvoiceDialog.tsx`
- Apply the same sticky footer pattern: move scroll to the form body only, keep `DialogFooter` fixed at the bottom with a border separator

## Technical Details

The pattern applied to both files:

```
DialogContent (flex flex-col, max-h-[90vh], no overflow)
  DialogHeader (static)
  div.flex-1.overflow-y-auto (scrollable form content)
  DialogFooter (sticky, border-t, bg-background, pt padding)
```

This ensures:
- On desktop: footer stays visible at the bottom of the modal
- On mobile: footer remains accessible without scrolling through all line items
- A subtle top border on the footer provides visual separation from scrolling content

## Files Modified

```
src/components/invoices/CreateInvoiceFromSOV.tsx  -- Sticky footer
src/components/invoices/CreateInvoiceDialog.tsx   -- Sticky footer
```
