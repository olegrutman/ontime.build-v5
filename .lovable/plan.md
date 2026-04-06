

# Platform Admin: Role Rules Manager + KPI Card Configurator

## Overview

Add two new pages to the platform admin area:
1. **Role Rules** — a searchable, editable catalog of all role-based permission rules in the app
2. **KPI Configuration** — lets platform owner choose which KPI cards each user type sees on their dashboard

Both pages store their configuration in the existing `platform_settings` key-value table — no new tables needed.

## Architecture

### Data model

All config stored as JSONB values in `platform_settings`:

- Key `role_rules`: array of rule objects `{ id, category, rule_name, description, gc, tc, fc, supplier, enabled }`
- Key `kpi_config_gc`: array of KPI card definitions for GC dashboard
- Key `kpi_config_tc`: array for TC
- Key `kpi_config_fc`: array for FC  
- Key `kpi_config_supplier`: array for Supplier

Each KPI entry: `{ key: string, label: string, enabled: boolean, order: number }`

### Seeding

On first load, if the setting key doesn't exist, the page seeds the default values from the current hardcoded rules/KPIs so the platform owner starts with a complete picture.

## Page 1: Role Rules (`/platform/rules`)

### What gets cataloged

Scan through the codebase's existing role checks and create a static seed of ~25 rules organized by category:

| Category | Example Rules |
|----------|--------------|
| **SOV** | FC cannot edit SOV line items; FC cannot lock/unlock SOV; FC cannot add SOV items |
| **Change Orders** | TC can request FC input; FC can only edit if active collaborator; GC sees final TC price only |
| **Invoices** | GC approves invoices; TC/FC submit invoices; FC sees only own invoices |
| **Contracts** | Project creator manages all contracts; TC can add GC and FC; GC can add TC |
| **Dashboard** | GC sees margin KPIs; Supplier sees receivables; FC sees 3-card layout |
| **Projects** | Material responsibility toggle based on creator org type; Tab feature gating |

### UI

- Card with a searchable table (filter by category or keyword)
- Each row: rule name, description, category, checkboxes for GC/TC/FC/Supplier, enabled toggle
- Platform owner can toggle rules on/off and change which roles a rule applies to
- Save button persists to `platform_settings`
- Note: toggling a rule here sets the *configuration intent* — the actual enforcement requires the app code to read these settings (future wiring)

## Page 2: KPI Configuration (`/platform/kpis`)

### Current hardcoded KPIs

**GC (4 cards)**: Contract Value, Paid Out, Received, Projected Margin
**TC (4 cards)**: Contract In, Cost Out, Projected Margin, Materials Forecast  
**FC (3 cards)**: Contract Value, Collected, Outstanding
**Supplier (4 cards)**: Total Receivable, Paid This Month, Open Orders, Credit Exposure

### UI

- Four tabs: GC, TC, FC, Supplier
- Each tab shows a reorderable list of KPI cards with:
  - Label (editable text input)
  - Subtitle (editable)
  - Enabled toggle
  - Drag handle for reordering (or up/down arrows)
- "Add KPI" button to add a custom card definition
- Save per tab

## Implementation

### Step 1: Database — no migration needed
Uses existing `platform_settings` table with new keys.

### Step 2: New pages + route registration

| New File | Purpose |
|----------|---------|
| `src/pages/platform/PlatformRoles.tsx` | Role rules management page |
| `src/pages/platform/PlatformKPIs.tsx` | KPI card configuration page |

### Step 3: Update navigation

| File | Change |
|------|--------|
| `src/components/platform/PlatformSidebar.tsx` | Add "Role Rules" and "KPI Cards" nav items |
| `src/App.tsx` | Add `/platform/rules` and `/platform/kpis` routes |

### Step 4: Seed data constants

| New File | Purpose |
|----------|---------|
| `src/constants/defaultRoleRules.ts` | Default ~25 rules derived from current codebase |
| `src/constants/defaultKpiConfig.ts` | Default KPI card configs per user type |

### What is NOT changing
- Actual role enforcement logic in hooks (future work to read from config)
- `DashboardKPIs.tsx` rendering (future work to read from config)  
- Database schema, RLS policies
- Existing platform pages

