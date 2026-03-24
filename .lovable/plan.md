

# Fix: Broken Links & Missing Data in CO Board

## Issues Found

### Bug 1: CO Board cards always show `$0`
In `COBoardCard.tsx` line 125, the amount is hardcoded as `fmtCurrency(0)`. The `ChangeOrderWithMembers` type doesn't include financial data, so there's no amount to display. The fix is to use `co.tc_submitted_price` (or a simple field from the CO record) as the card amount — this avoids needing to compute full financials per card.

### Bug 2: SOV, Edit, and Contracts routes bypass the project layout
In `App.tsx`, the routes `/project/:id/sov` (line 181), `/project/:id/edit` (line 175), `/project/:id/contracts` (line 180) are standalone page routes that render outside the `ProjectHome` layout. React Router v6 ranks static segments higher than dynamic `:section`, so clicking "SOV" in the icon rail navigates to the standalone `ProjectSOVPage` (no icon rail, no project topbar) instead of the embedded tab. Same for contracts and edit.

**Fix**: Remove the standalone `/project/:id/sov` and `/project/:id/contracts` routes from App.tsx since ProjectHome already handles `activeTab === 'sov'` and `activeTab === 'contracts'` internally. Keep `/project/:id/edit` as it's intentionally a separate full-page editor.

### Bug 3: DailyLogPanel uses fragile `window.location.pathname` manipulation
Line 158 of `DailyLogPanel.tsx` uses `window.location.pathname.replace(...)` for navigation instead of React Router's `navigate()`. This works but is fragile. Low priority — cosmetic fix.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/change-orders/COBoardCard.tsx` | Replace `fmtCurrency(0)` with `fmtCurrency(co.tc_submitted_price ?? 0)` to show actual CO value |
| `src/App.tsx` | Remove `/project/:id/sov` and `/project/:id/contracts` standalone routes (lines 180-181) so the `:section` catch-all in ProjectHome handles them with the full project layout |

