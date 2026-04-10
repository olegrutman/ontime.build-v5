

# Remove All Abbreviations from UI — Full App Sweep

## Problem
The previous abbreviation cleanup only covered role badges, team cards, and platform roles. Many UI-facing labels still show "GC", "TC", "FC" abbreviations across dashboards, KPI cards, table headers, toast messages, alerts, status badges, and project wizard steps.

## Rule
Replace all user-visible abbreviations with full names: "General Contractor", "Trade Contractor", "Field Crew", "Supplier". Internal code logic (`orgType === 'GC'`, variable names, comments) stays unchanged.

## Files to Change

| # | File | What to fix |
|---|------|-------------|
| 1 | `src/constants/defaultKpiConfig.ts` | Labels/subtitles: "GC Contracts (Revenue)" → "General Contractor Contracts (Revenue)", "FC / Labor Contracts (Cost)" → "Field Crew / Labor Contracts (Cost)", "Received from GC" → "Received from General Contractor", "Pending from GC", "Materials (TC POs)", "GC Profit Margin", "TC Contracts Committed", "Pending GC Approval", "Materials (GC POs)", "Contract with TC", "Paid by TC", "Pending from TC" |
| 2 | `src/components/dashboard/GCDashboardView.tsx` | KPI card labels: "GC PROFIT MARGIN", "MATERIALS (GC POs)", "PENDING GC APPROVAL", "TC CONTRACTS COMMITTED". Table headers: "TC Contracts (Costs)". Fallback text: "No TC contracts yet" |
| 3 | `src/components/dashboard/TCDashboardView.tsx` | KPI labels: "GC CONTRACTS (REVENUE)", "FC / LABOR CONTRACTS (COST)", "RECEIVED FROM GC", "PENDING FROM GC", "MATERIALS (TC POs)". Table headers: "GC Contract", "FC Cost", "FC Contract". Subtitles: "with GC", "awaiting GC approval", "Chasing GC". Fallback: "No FC contracts yet" |
| 4 | `src/components/dashboard/FCDashboardView.tsx` | KPI label: "CONTRACT WITH TC". Subtitles/fallbacks using "'TC'" as display. Attention items: "Awaiting TC Approval" |
| 5 | `src/components/dashboard/DashboardKPIs.tsx` | Subtitles: "Revenue from GC contracts", "From TC/GC contracts" |
| 6 | `src/components/project/TCProjectOverview.tsx` | Buttons: "Submit Invoice to GC", "View GC Contract". KPI labels: "GC CONTRACT (WHAT YOU EARN)", "FC CONTRACT (YOU SET THIS)". Table rows: "Contract Value (set by GC)", "Approved COs (billed to GC)", "Received from GC", "Pending from GC", "GC Contract (your revenue)", "FC Contract (your cost)", "TC Gross Margin", "TC Margin %", "CO Revenue (from GC)", "CO Cost (to FC)", "Net TC Margin after COs", "Save FC Contract". Warnings: "Invoice Awaiting GC Approval", "Chasing GC", "FC Invoice Awaiting Your Approval", "You owe FC", "GC waiting on answers" |
| 7 | `src/pages/GCProjectOverview.tsx` | Subtitle: "awaiting GC sign-off" |
| 8 | `src/pages/platform/PlatformGCDashboard.tsx` | Labels: "GC PROFIT MARGIN", "PENDING GC APPROVAL", "TC CONTRACTS COMMITTED", "MATERIALS BUDGET (GC POs)". Warnings: "Pending GC Approval" |
| 9 | `src/components/project/PurchaseOrdersTab.tsx` | Toasts: "PO sent to GC for approval", "sent to GC for approval". Tab label: "From GC" |
| 10 | `src/components/quick-log/LoggedItemsList.tsx` | Status badges: "Sent to TC", "Sent to GC" |
| 11 | `src/components/quick-log/QuickLogAlertBanner.tsx` | Banner text: "FC tasks not yet sent to GC" |
| 12 | `src/components/change-orders/COContextualAlert.tsx` | Alert text: "Submitted to GC — waiting on approval", fallback "FC" label |
| 13 | `src/components/change-orders/COStickyFooter.tsx` | Button labels: "Submit ... to TC →", "Submit ... to GC →" |
| 14 | `src/components/change-orders/COMaterialsPanel.tsx` | Toast: "sent to GC for approval" |
| 15 | `src/components/change-orders/CONTEPanel.tsx` | Text: "pending GC approval" |
| 16 | `src/components/purchase-orders/CreateInvoiceFromPO.tsx` | Alert & placeholder text: "TC-to-GC contract", "bill the GC" |
| 17 | `src/components/project-wizard-new/UnifiedReviewStep.tsx` | Labels: "GC → TC Contract", "TC → FC Contract" |
| 18 | `src/components/project-wizard-new/ContractsStep.tsx` | Labels: "GC → You (Upstream)", "You → FC (Downstream)" |
| 19 | `src/components/setup-wizard-v2/ScopeQuestionsPanel.tsx` | Labels: "GC → TC SOV", "TC → FC SOV" |
| 20 | `src/components/invoices/InvoicesTab.tsx` | Comment text (visible as tab context): "Sent to GC / Received from FC" |

## Replacement Pattern

| Abbreviation | Full Name |
|---|---|
| GC | General Contractor |
| TC | Trade Contractor |
| FC | Field Crew |
| SP/SUP | Supplier |

Examples:
- "GC CONTRACTS (REVENUE)" → "GENERAL CONTRACTOR CONTRACTS (REVENUE)"
- "Received from GC" → "Received from General Contractor"
- "FC / Labor Contracts (Cost)" → "Field Crew / Labor Contracts (Cost)"
- "Materials (TC POs)" → "Materials (Trade Contractor POs)"
- "Chasing GC" → "Chasing General Contractor"
- "GC → TC Contract" → "General Contractor → Trade Contractor Contract"
- "Submit Invoice to GC" → "Submit Invoice to General Contractor"

Internal variable names, type checks, and code comments remain unchanged.

