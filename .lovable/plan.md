

# Fix SOV Billing Status Display

## Problem
The `billing_status` column in `project_sov_items` defaults to "unbilled" and is **never updated** by any trigger or function when invoices are created. The triggers only update `total_billed_amount`, `total_completion_percent`, and `billed_to_date`. So items that have been billed still show "Unbilled".

## Solution
Derive the status from the actual financial data instead of trusting the stale column. Two places need updating:

### 1. `src/pages/platform/PlatformProjectDetail.tsx`
Replace the raw `billing_status` display with a computed status:
- `total_billed_amount >= value_amount` and both > 0 → **"Fully Billed"** (green)
- `total_billed_amount > 0` but less than value → **"Partially Billed"** (amber)  
- `total_billed_amount === 0` or null → **"Unbilled"** (outline/gray)

### 2. `src/pages/ProjectSOVPage.tsx`
The `BillingStatusBadge` component receives `item.billing_status`. Update it (or its caller) to pass a computed status using the same logic above, based on `billed_to_date` and `scheduled_value`.

### 3. Find `BillingStatusBadge` and update it
Update the badge component to accept the derived status strings and style them with appropriate colors.

No database migration needed — this is purely a display fix using data that already exists.

## Files to edit
- `src/pages/platform/PlatformProjectDetail.tsx`
- `src/pages/ProjectSOVPage.tsx`  
- The `BillingStatusBadge` component file (need to locate)

