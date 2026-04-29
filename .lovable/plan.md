Plan:

1. Fix internal-cost edit eligibility for TCs
- Update the line-item row logic so TC internal cost entries can be edited when the CO is not final.
- Keep ownership protection: users can only edit entries from their own org/role.
- Ensure internal costs stay editable until `approved`, `rejected`, or `contracted`.

2. Fix the internal-cost form prefill/save behavior
- When editing an existing internal-cost entry, prefill the form with the actual saved dollar amount.
- Avoid the current blank/invalid edit state for internal cost rows.
- Save updates back to the existing `co_labor_entries` row instead of creating a new row.

3. Move edit controls beside the values they edit
- Put the billable edit pencil directly beside the billable dollar amount.
- Put the internal-cost edit control directly beside the internal cost dollar amount.
- Keep the far-right column only for row actions/spacing as needed, so users are not guessing which number the pencil affects.

4. Test the TC path
- Verify the current CO row shows an edit affordance next to both Billable and Int. Cost for TC-owned entries.
- Verify clicking internal cost opens the edit form with the saved amount populated.
- Verify saving updates the amount and refreshes the financial totals.