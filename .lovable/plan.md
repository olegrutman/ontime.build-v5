

# Enhance Project Overview V2 with Missing Critical Info

## What's Missing
The current `ProjectOverviewV2` shows only a single "Contract" value and basic budget metrics. It lacks:
1. **Team card** with material responsibility indicator
2. **Profit margin** section (role-aware, matching existing `ProfitCard` logic)
3. **Upstream AND downstream contracts** for TC role (currently only shows upstream)
4. **Material responsibility awareness** — hide material orders/budget rows when TC is NOT material-responsible

## Implementation

### 1. Pass additional props to `ProjectOverviewV2`
Add `isFC` flag from `ProjectHome.tsx` so the component can receive role context. The `financials` object already contains `viewerRole`, `isTCMaterialResponsible`, `isGCMaterialResponsible`, `upstreamContract`, `downstreamContract`, `isTCSelfPerforming`, and all profit-related fields.

### 2. Add Contracts Section (below hero, above pills)
- Show **upstream contract** (GC↔TC) with counterparty name, sum, retainage
- For TC role: also show **downstream contract** (TC↔FC) if it exists
- For FC role: show their FC↔TC contract
- Compact row format: role label, org name, contract sum in mono font
- Clickable → navigates to `sov` tab

### 3. Add Team Card Section (right column, above donut)
- Embed a compact version of team info: list team member orgs with role dots (GC=blue, TC=green, FC=purple, SUP=amber)
- Show material responsibility badge: "Materials: TC" or "Materials: GC" with Package icon
- Data from existing `financials.isTCMaterialResponsible` / `isGCMaterialResponsible`
- Fetch team members via a lightweight query (same pattern as `TeamMembersCard`)

### 4. Add Profit Position Section (right column, below donut)
- Embed the profit calculation logic from `ProfitCard` directly into the overview
- **GC**: Owner Contract vs Current Contract → GC Profit
- **TC without materials**: Revenue − FC Labor → Labor Margin
- **TC with materials**: Labor Margin + Material Margin → Total Profit
- **FC**: Contract − Actual Cost → FC Profit
- Use existing `useActualCosts` hook for actual cost data
- Compact card format matching demo-v2 style

### 5. Material Responsibility Awareness
- In the **budget tab**: hide "Material Ordered" row when `!isTCMaterialResponsible && viewerRole === 'Trade Contractor'`
- In the **orders tab**: hide "View All POs →" link when TC is not material-responsible
- In the **hero KPI tiles**: adjust what's shown based on role (e.g., FC doesn't see material data)

### 6. Conditionally show/hide material orders link
- Check `financials.isTCMaterialResponsible` and `financials.isGCMaterialResponsible`
- If TC is NOT responsible for materials, remove material-related budget rows and PO quick link from the overview

## Files Modified
- `src/components/project/ProjectOverviewV2.tsx` — add contracts section, team card, profit card, material-awareness conditionals
- `src/pages/ProjectHome.tsx` — pass `isFC` prop (minor)

## Files NOT Changed
- `ProfitCard.tsx`, `ContractHeroCard.tsx`, `TeamMembersCard.tsx` — kept as-is, logic replicated in compact form inside overview
- Database, hooks, edge functions — untouched

