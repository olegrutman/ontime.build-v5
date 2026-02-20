
# Make Totals Section Sticky with Footer Buttons

## Overview
Move the gross amount / retainage / net totals out of the scrollable area and into the sticky footer section of both invoice creation dialogs. This way users always see the running totals alongside the action buttons without scrolling.

## Changes

### File: `src/components/invoices/CreateInvoiceDialog.tsx`
- Move the "Totals" block (Subtotal, Retainage, Total Due) from inside the scrollable `div` to above the `DialogFooter`, inside a new sticky footer wrapper
- Combine the totals and footer into one sticky bottom section with `border-t bg-background pt-4 shrink-0`
- The Notes field stays inside the scrollable area

### File: `src/components/invoices/CreateInvoiceFromSOV.tsx`
- Move the "Gross Amount Summary" card (the one showing Gross Amount, retainage, and Net) from inside the scrollable content to a sticky bottom section above the `DialogFooter`
- Combine the summary card and footer into one sticky wrapper

## Technical Details

Both files will follow this structure:

```
DialogContent (flex flex-col, max-h-[90vh], overflow-hidden)
  DialogHeader (static)
  div.flex-1.overflow-y-auto (scrollable form -- line items, notes, etc.)
  div.shrink-0.border-t.bg-background.pt-4 (sticky bottom section)
    Totals summary (gross, retainage, net)
    DialogFooter (Cancel + Create buttons)
```

For `CreateInvoiceDialog.tsx`: the totals `div` (lines 430-446) moves out of the scrollable area into the sticky footer section, placed above the existing `DialogFooter` buttons.

For `CreateInvoiceFromSOV.tsx`: the Gross Amount Summary `Card` (lines 457-474) moves out of the scrollable area into the sticky footer section. The summary card already exists at the top of the form content; we will relocate it to the bottom sticky area so it updates in view as the user toggles line items.

## Files Modified

```
src/components/invoices/CreateInvoiceDialog.tsx      -- Move totals to sticky footer
src/components/invoices/CreateInvoiceFromSOV.tsx      -- Move gross amount card to sticky footer
```
