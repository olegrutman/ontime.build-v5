
# Comprehensive CO/WO Test Suite

## Layer 1: Pure Unit Tests (Vitest)

Test pure utility functions with no DB dependencies.

**File: `src/test/coLabel.test.ts`**
- `coLabel('CO')` → "Change Order", `coLabel('WO')` → "Work Order"
- `coLabel('CO', true)` → "Change Orders" (plural)
- `coAbbrev` returns "CO"/"WO"/"COs"/"WOs"
- `docTypeFromMode(true)` → "WO", `docTypeFromMode(false)` → "CO"

**File: `src/test/pickerTypes.test.ts`**
- `blankItem()` returns correct defaults (markup 18, empty locations, etc.)
- `initialPickerState('TC')` sets role and single blank item
- `itemLaborTotal` — sums rate * hours across entries
- `itemMaterialTotal` — sums unitCost * quantity
- `itemEquipmentTotal` — sums costs
- `itemSubtotal` — applies markup and multi-location multiplier correctly
- `grandTotal` — sums multiple items
- `locationDisplay` / `locationShort` — edge cases (0, 1, multiple locations)

## Layer 2: Reducer Tests (Vitest)

Test the `pickerReducer` state machine without rendering.

**File: `src/test/pickerReducer.test.ts`**

Import the reducer directly (needs a small refactor to export it, or test via `usePickerState` with `renderHook`).

- **SET_STEP** — updates step number
- **SET_LOCATION** — sets locations array on current item
- **TOGGLE_MULTI_LOCATION** — toggles flag; trims to 1 location when disabling
- **SET_SYSTEM** — sets system id and name
- **SET_CAUSE** — sets causeId, causeName, docType, billable, reason
- **SET_PRICING** — sets pricingType and pricingName
- **TOGGLE_WORK_TYPE** — adds new type, removes existing type (toggle)
- **SET_NARRATIVE** — updates narrative string
- **SET_LABOR_HOURS** — updates specific labor entry hours
- **ADD_MATERIAL / REMOVE_MATERIAL** — add and remove by tempId
- **ADD_EQUIPMENT / REMOVE_EQUIPMENT** — same pattern
- **ADD_ITEM** — inherits cause/pricing/markup from current item, resets step to 1
- **SWITCH_ITEM** — changes currentItemIndex
- **DELETE_ITEM** — can't delete last item; adjusts index if needed
- **SET_SUBMITTED** — flips submitted flag
- **SET_LINKED_RFI** — stores RFI id
- **Collaboration actions** — SET_ASSIGNED_TC, SET_REQUEST_FC, SET_ASSIGNED_FC

## Layer 3: Edge Function Tests

### 3a. Deno Unit Tests

**File: `supabase/functions/generate-co-pdf/index_test.ts`**
- Calls the function with a valid `co_id` via fetch, checks 200 status and `application/pdf` content type
- Calls with missing `co_id`, expects 400
- Calls with non-existent UUID, expects error response

**File: `supabase/functions/generate-payment-app-pdf/index_test.ts`**
- Same pattern: valid project_id + co_ids returns PDF
- Missing params returns 400

### 3b. curl_edge_functions Integration Tests
- Hit `generate-co-pdf` with a real CO id from the database and verify response
- Hit `send-co-external-invite` with test data and verify invite creation

## Layer 4: Database Query Tests

Using `read_query` to validate data integrity and RLS:

- **CO numbering**: Query `change_orders` for a project, verify `co_number` format matches `WO-XXX-XX-XX-0001` pattern
- **Status constraints**: Verify status values are within allowed set
- **Line items linkage**: Check all `co_line_items.co_id` values reference valid `change_orders.id`
- **Labor entries**: Verify `co_labor_entries` link to valid line items
- **Materials/Equipment**: Verify entries have valid co_id references
- **RFI linkage**: Check `rfis` table has valid project_id references
- **External invites**: Verify `co_external_invites` tokens are unique and have expiry dates

## Layer 5: Browser Automation Tests

Navigate the live preview and test the CO/WO UI flows:

1. **CO List Page**: Navigate to project's change-orders tab, verify list renders
2. **New CO Creation**: Click "+ New" button, verify draft creation and redirect to detail page
3. **Detail Page Checklist**: On a new draft CO, verify the creation checklist shows unchecked items
4. **Inline Editing**: Observe editable fields on detail page (location, reason)
5. **Picker Wizard**: Click "Use guided wizard instead", verify 4-step flow renders with correct step labels
6. **RFI Banner**: If a CO has a linked RFI, verify the block banner appears
7. **PDF Download**: Click "Download PDF" button on an approved CO, verify network request fires
8. **Responsive**: Resize viewport to 390px width and verify layout doesn't break

---

## Technical Details

- All Vitest tests go in `src/test/` following existing conventions
- Reducer test requires exporting `pickerReducer` from `usePickerState.ts` (minor refactor)
- Edge function Deno tests use `import "https://deno.land/std@0.224.0/dotenv/load.ts"` for env vars
- Browser tests use `navigate_to_sandbox` → `observe` → `act` → `screenshot` workflow
- DB tests are read-only queries via `read_query` tool — no migrations needed
- Estimated: ~6 test files, ~80-100 individual test cases

## Execution Order

1. Unit tests + reducer tests first (fastest, no dependencies)
2. DB query validation (read-only, fast)
3. Edge function tests (requires deployment)
4. Browser automation tests (slowest, done last)
