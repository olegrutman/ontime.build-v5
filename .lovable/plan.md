

# Apply Demo-V2 Design Language Across All Pages

## What This Covers
Systematically restyle every remaining page and component to match the demo-v2 visual language: consistent typography (Barlow Condensed headings, IBM Plex Mono for $ and IDs), compact card styling, section headers, animated progress bars, 3px left accents, colored icon tiles, and fadeUp stagger animations — all on light surfaces.

## Batch 1: Shared Design Tokens + Card Components

### Create `src/lib/design-tokens.ts`
Reusable constants and utility classes for the design system:
- Section header class: `text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground font-medium`
- Card wrapper class: `bg-card border border-border rounded-lg`
- Currency font style: `fontFamily: "'IBM Plex Mono', monospace"`
- Heading font style: `fontFamily: "'Barlow Condensed', sans-serif"`
- Standard card padding: `px-3.5 py-3.5`

### Restyle `RFICard.tsx`
- Remove shadcn Card wrapper, use raw div with `bg-card border border-border rounded-lg`
- Add 3px left border colored by priority (red=urgent, amber=high, blue=normal)
- RFI number in IBM Plex Mono
- fadeUp animation with stagger index

### Restyle `InvoiceCard.tsx`
- Same card pattern: 3px left border colored by status (blue=draft, amber=submitted, green=approved, red=rejected)
- Dollar amounts in IBM Plex Mono
- Invoice number in IBM Plex Mono
- Remove heavy icon tile, use compact layout matching demo-v2 density

### Restyle `COBoardCard.tsx`
- Already has 3px left stripe and progress bar — mostly aligned
- Add IBM Plex Mono to CO number and currency
- Add Barlow Condensed to title
- Ensure fadeUp stagger on grid render

## Batch 2: Standalone Pages

### `PurchaseOrders.tsx`
- Replace `Card`/`CardHeader`/`CardContent` with flat `bg-card border border-border rounded-lg` divs
- Section header pattern for "Orders" heading
- PO numbers in IBM Plex Mono, amounts in IBM Plex Mono
- Status badges use the demo-v2 subtle background pattern
- Master-detail split: left list gets compact row styling with 3px left accent

### `PartnerDirectory.tsx`
- Section header for "Partner Directory"
- Organization/people cards use compact row layout with avatar initials circle
- Search input with subtle border, no heavy Card wrapper
- Tab pills use the same rounded-full pill pattern as CO filter pills

### `Profile.tsx`
- Replace Card sections with flat `bg-card border border-border rounded-lg` panels
- Section labels use uppercase tracking pattern
- Form inputs keep existing functionality, just tighter spacing (gap-2.5)
- Save buttons: primary amber

### `Settings.tsx`
- Same flat panel pattern as Profile
- Section headers uppercase
- Toggle/switch rows with consistent spacing

### `OrgTeam.tsx`
- Member list as compact rows with avatar initials, role badge
- Invite section with subtle border panel
- Join requests with 3px left amber border

### `Financials.tsx`
- Financial card and trend charts keep existing data but apply section header pattern
- Dollar values in IBM Plex Mono
- Headings in Barlow Condensed

### `Reminders.tsx`
- Already uses RemindersTile — add section header, fadeUp animation

### `RFIs.tsx` (standalone page)
- Project selector uses compact design
- Section header pattern

## Batch 3: Project Sub-Tab Components

### `InvoicesTab.tsx`
- Tab filter pills use rounded-full pattern (same as CO filter pills)
- Grid of invoice cards gets fadeUp stagger
- Empty state: centered with section header typography

### `RFIsTab.tsx`
- Same pill filter pattern for status tabs
- Card grid with fadeUp stagger

### `COListPage.tsx`
- Already has filter pills — ensure they match the demo-v2 rounded-full pattern (they already do)
- KPI row: add IBM Plex Mono to dollar values, Barlow Condensed to numbers
- Ensure fadeUp on card grid

### Project Overview Cards
- `UrgentTasksCard.tsx`: 3px left border items with icon tiles, section header
- `BillingCashCard.tsx`: IBM Plex Mono for all amounts, section header pattern
- `TeamMembersCard.tsx`: Avatar initials circles, compact rows
- `ProfitCard.tsx`: IBM Plex Mono values, Barlow Condensed heading
- `BudgetTracking.tsx`: Progress bars with animated width, section headers

## Batch 4: Supplier Dashboard Components

### `SupplierKPIStrip.tsx`
- Already well-styled — add 2px bottom accent line to match GC dashboard KPIs

### `SupplierActionQueue.tsx`, `SupplierOpenOrders.tsx`, `SupplierProjectList.tsx`, `SupplierDeliverySchedule.tsx`, `SupplierReceivables.tsx`
- Ensure consistent section header pattern (already close)
- Dollar amounts → IBM Plex Mono
- Status badges → subtle background pattern
- Add fadeUp stagger to list items

## Files Changed
~25 component files restyled. No database, edge function, or hook changes. All changes are CSS/className and inline style updates preserving existing functionality.

## Implementation Order
1. Design tokens file
2. Batch 1 (card components) — affects all pages
3. Batch 2 (standalone pages)
4. Batch 3 (project sub-tabs)
5. Batch 4 (supplier dashboard)

