

# Make Actual Cost Row Tappable in Profit Position Card

## Change

In `ProfitCard.tsx`, make the "Actual Cost" / "Internal Cost" rows in both TC sections (with and without materials) tappable to open `ActualCostPopup`. Also do the same for the FC section's Actual Cost row.

## Implementation — `ProfitCard.tsx`

1. **Add state**: `const [costPopupOpen, setCostPopupOpen] = useState(false);`
2. **Import** `ActualCostPopup` from `@/components/change-order-detail/ActualCostPopup`
3. **Replace static divs** with tappable buttons for the "Actual Cost" / "Internal Cost" rows in three places:
   - **TC without materials** (line 222-229): wrap in a `button` with `onClick={() => setCostPopupOpen(true)}` and add hover styling
   - **TC with materials** (line 297-304): same treatment
   - **FC section** (line 161-168): same treatment when showing "Actual Cost"
4. **Render `ActualCostPopup`** at the bottom of each section, scoped to `projectId`, with `earningsOrRevenue` set to the relevant revenue/contract total and appropriate label

| Location | `earningsOrRevenue` | `label` |
|----------|-------------------|---------|
| TC (no materials) | `revenueTotal` | `"Revenue"` |
| TC (with materials) | `revenueTotal` | `"Revenue"` |
| FC | `fcContractTotal` | `"Contract Total"` |

Only one file changes: `src/components/project/ProfitCard.tsx`.

