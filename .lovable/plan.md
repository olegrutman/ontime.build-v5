

# Add Company Addresses to Invoice Export

## What
Include the sender (From) and receiver (To) company addresses in the exported invoice HTML, pulled from the `organizations.address` jsonb field.

## Current State
- The invoice download edge function already fetches `from_org(name)` and `to_org(name)` via the contract join
- The `organizations` table has an `address` jsonb column with structure `{street, city, state, zip}`
- The "From" and "To" info boxes currently show only the company name

## Change

### `supabase/functions/invoice-download/index.ts`

1. **Expand the contract select query** to include address fields from both orgs:
   ```
   from_org:organizations!...(name, address, phone)
   to_org:organizations!...(name, address, phone)
   ```

2. **Also handle PO-linked invoices** (no contract) — fetch the PO's buyer/supplier org addresses similarly.

3. **Update the From/To info boxes** in the HTML template to render address lines below the company name:
   ```html
   <div class="info-box">
     <h3>From</h3>
     <p><span class="value">IMIS, LLC</span></p>
     <p>123 Main St</p>
     <p>Denver, CO 80202</p>
     <p>(303) 555-1234</p>
   </div>
   ```

4. **Add a helper function** `formatOrgAddress(org)` that builds the address lines from the jsonb, handling missing fields gracefully.

### Files Changed
- `supabase/functions/invoice-download/index.ts` — expand org select, render addresses

