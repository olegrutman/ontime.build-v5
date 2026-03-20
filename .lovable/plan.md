

# Unify Visual Language Across the Entire App

## Problem

The dashboard has a polished, consistent design language, but other pages/wizards diverge significantly:
- **Dashboard cards** use `bg-card border border-border rounded-lg` with `font-heading text-[2rem] font-black` for KPI values, `text-[0.7rem] uppercase tracking-[0.4px]` for labels, and `text-[0.82rem] font-semibold` for data rows
- **Project pages** use generic `Card`/`CardContent` (with `rounded-2xl`), inconsistent font sizes (`text-xl`, `text-2xl font-bold`), and `text-sm`/`text-base` instead of the precise rem scale
- **Wizards** (RFI, Project, CO) each have different review step aesthetics — the RFI wizard uses centered icons, the Project wizard uses generic Card components, and the CO wizard uses a custom `co-light-shell` pattern
- **MetricStrip** uses `rounded-xl` cards with `text-xl sm:text-2xl font-bold` instead of `font-heading font-black`
- **RemindersTile** still uses generic `Card`/`CardHeader`/`CardTitle` with `text-base` sizing

## Design Tokens Extracted from Dashboard

```text
CARD SHELL:       bg-card border border-border rounded-lg
CARD HEADER:      px-4 py-3, font-heading text-[1rem] font-bold
CARD COUNT:       text-[0.72rem] text-muted-foreground
KPI VALUE:        font-heading text-[2rem] font-black tracking-tight leading-none
KPI LABEL:        text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground
ROW TEXT:         text-[0.82rem] font-semibold text-foreground
ROW SUB:          text-[0.68rem] text-muted-foreground
BADGE:            text-[0.58rem]-[0.68rem] px-1.5-2 py-0-0.5 rounded-full font-semibold
TABLE HEADER:     text-[0.64rem] uppercase tracking-[0.8px] text-muted-foreground
BAR:              h-1.5 bg-accent rounded-full
HOVER:            hover:bg-accent/50 transition-colors
MIN HEIGHT:       56px for tappable rows
```

## Changes — Grouped by Area

### 1. Shared UI Primitives

**`src/components/ui/card.tsx`** — Update default `Card` to use `rounded-lg` (not `rounded-2xl`) to match dashboard. Keep `shadow-sm`.

**`src/index.css`** — Add reusable utility classes:
- `.card-header-row` — standard card header layout (title + count/action)
- `.kpi-value` — font-heading black large numbers
- `.kpi-label` — uppercase tracking label
- `.data-row` — standard list row with 56px min-height and hover

### 2. Project Home Components (~8 files)

- **`MetricStrip.tsx`**: Change metric numbers from `text-xl sm:text-2xl font-bold` → `font-heading text-[1.5rem] font-black`, labels from `text-sm` → `text-[0.72rem] uppercase tracking-[0.4px]`, card from `rounded-xl` → `rounded-lg`
- **`ContractHeroCard.tsx`**: Use dashboard KPI card pattern for contract values — `font-heading font-black`, consistent label sizing
- **`BillingCashCard.tsx`**, **`ProfitCard.tsx`**, **`BudgetTracking.tsx`**: Align card shells and number typography to dashboard tokens
- **`UrgentTasksCard.tsx`**, **`TeamMembersCard.tsx`**, **`CriticalScheduleCard.tsx`**: Standardize card headers to `font-heading text-[1rem] font-bold` with border-border rounded-lg pattern
- **`ProjectReadinessCard.tsx`**, **`PendingInviteCard.tsx`**: Same card normalization

### 3. Wizard Review Steps (~3 files)

- **`COWizard StepReview.tsx`**: Update section cards to use dashboard card pattern (rounded-lg, consistent label/value sizing with `text-[0.82rem]`/`text-[0.68rem]`)
- **`RFI RFIReviewStep.tsx`**: Replace centered-icon hero with simpler heading, use bordered section cards matching dashboard style
- **`Project ReviewStepNew.tsx`**: Replace generic `Card`/`CardHeader`/`CardTitle` with dashboard-style card shells and typography tokens

### 4. Tab Pages (~4 files)

- **`InvoicesTab.tsx`**: Verify table headers match dashboard table header style (`text-[0.64rem] uppercase tracking-[0.8px]`), badge sizes match
- **`RFIsTab.tsx`**: Standardize card/list row patterns
- **`COListPage.tsx`**: Already uses the light system — normalize card shell to `rounded-lg`
- **`PurchaseOrdersTab.tsx`**: Same table/badge normalization

### 5. Dashboard Outlier

- **`RemindersTile.tsx`**: Replace `Card`/`CardHeader`/`CardTitle` with the raw `bg-card border border-border rounded-lg` pattern + `font-heading text-[1rem] font-bold` header to match siblings

### 6. Sidebar & Layout

These already follow the design system — no changes needed.

## What This Does NOT Change
- Color palette (already consistent via CSS variables)
- Font families (already set in tailwind config)  
- Wizard flow/logic (only visual alignment)
- Mobile responsive behavior (preserved, just normalized)

## Estimated Scope
~15–18 files edited, mostly typography and card shell class changes. No database or backend changes.

