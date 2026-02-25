

# Fix: Create Return Wizard — 5 Improvements

## 1. Supplier auto-populated from project team (not PO-based lookup)

**Problem**: The current wizard queries the `purchase_orders` table to find suppliers, which returns wrong results and requires a DELIVERED PO to exist.

**Fix**: Query `project_team` where `role = 'Supplier'` and `status = 'Accepted'` (same pattern used in `useChangeOrderProject.ts`). If only one supplier is on the team, auto-select it and skip the dropdown. Then fetch delivered PO line items for that supplier org.

## 2. Add search/filter to item list (match PO material picker UX)

**Problem**: The flat table of delivered items can be very long and hard to scan.

**Fix**: Add a search input above the items table that filters by description. Also add a "Select All (filtered)" checkbox in the header. This keeps it simple without importing the full PO product picker (which is catalog-based and not applicable here since we're selecting from already-delivered PO line items).

## 3. Expand reason descriptions with examples

**Problem**: Current reason labels are terse (e.g., "Wrong") and don't guide the user.

**Fix**: Update `RETURN_REASONS` to include a label and description. Display as radio cards instead of a plain select:

| Value | Label | Description |
|-------|-------|-------------|
| Extra | Extra Material | Ordered more than needed for the job |
| Wrong | Wrong Product | Item does not match specification or what was ordered |
| Estimate Over | Estimate Overage | Estimated quantities exceeded actual usage |
| Damaged | Damaged on Delivery | Material arrived damaged or defective |
| Other | Other | None of the above -- provide explanation |

Also rename "Wrong Type" sub-selector labels to "Not Per Specification" and "Wrong Item Shipped" for clarity.

## 4. Pickup date optional with urgency selector

**Problem**: Pickup date is currently required, blocking submission when the date isn't known yet. No urgency signal.

**Fix**:
- Make `pickupDate` optional (remove from `canProceedStep3` validation)
- Add an urgency selector: `Standard`, `Priority`, `Urgent`, `Emergency` (same options as work orders)
- Add urgency field to the `returns` table via migration (nullable text column)
- Show urgency in review step and on ReturnCard/ReturnDetail

## 5. Phone field with formatting

**Problem**: Contact phone is a plain text input with no formatting.

**Fix**: Import and use the existing `formatPhone` utility. Set `type="tel"` and apply formatting on change, matching the pattern used in Profile, AuthSection, and AccountStep.

## Technical Details

### Database Migration

```sql
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS urgency text;
```

### Files to modify

| Action | File | Changes |
|--------|------|---------|
| Edit | `src/types/return.ts` | Add `RETURN_REASON_DETAILS` map with label+description per reason. Add `UrgencyType`. Rename WrongType values. |
| Edit | `src/components/returns/CreateReturnWizard.tsx` | All 5 changes: team-based supplier query, search filter on items, reason radio cards, optional date + urgency, phone formatting |
| Edit | `src/components/returns/ReturnCard.tsx` | Show urgency badge if set |
| Edit | `src/components/returns/ReturnDetail.tsx` | Show urgency in header |
| Create | `supabase/migrations/XXXXXX_add_returns_urgency.sql` | Add urgency column |

