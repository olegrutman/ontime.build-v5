

# TC Dashboard Analysis

## Finding

The TC KPI dashboard code is **correctly implemented and wired**. The routing in `Dashboard.tsx` (line 216) properly checks `orgType === 'TC'` and renders `TCDashboardView` with all 8 expandable KPI cards.

The screenshot shows the old layout because the **Vite dev server lost its connection** (console log: `[vite] server connection lost. Polling for restart...`), so the preview was serving a stale cached version.

## What's Already Working

- `src/components/dashboard/TCDashboardView.tsx` — 579-line component with all 8 cards (GC Contracts, FC/Labor Costs, Gross Margin, CO Net Margin, Received from GC, Pending from GC, TC Material Budget, Open RFIs), "Action Required" warnings, and "My Projects" grid
- `src/pages/Dashboard.tsx` line 216 — TC branch renders `TCDashboardView` correctly
- Props, imports, and exports all match

## Recommended Action

**Refresh the preview** — the Vite server needs to reconnect. Once it does, the TC dashboard with the expandable KPI card design will display correctly. No code changes are needed.

If you'd like, I can navigate to the preview and take a screenshot to verify the current state after the server reconnects.

