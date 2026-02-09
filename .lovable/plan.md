

# T&M Time Card System for Work Orders

## What This Does

When creating a new Work Order, the user will choose between **Fixed Price** (current behavior) or **Time & Material (T&M)**. If T&M is selected, the system becomes a digital time card -- just like the paper carbon-copy process used on real job sites.

### How It Works (Plain English)

**Field Crew fills out a daily time card:**
- Date: 2/9/2026
- Number of men: 5
- Hours per man: 5
- Total man-hours: 25
- Description: "Framing second floor walls"

**Trade Contractor reviews the FC's card:**
- Sees the FC submission, can approve or reject it
- Adds their own hours if needed
- Sets the hourly rate (e.g., $85/hr)
- Submits the approved card to the GC

**General Contractor receives the final card:**
- Sees approved hours and total cost
- Can acknowledge (check mark) each entry
- Sees a running total of all hours and cost across the life of the work order

Each level only sees what they should -- like carbon copies where each party keeps their layer.

---

## Database Changes

### 1. Add `pricing_mode` column to `change_order_projects`

```text
ALTER TABLE change_order_projects
  ADD COLUMN pricing_mode text NOT NULL DEFAULT 'fixed';
```

Values: `'fixed'` or `'tm'`

### 2. New table: `tm_time_cards`

The core time card -- one per day per work order. This replaces the work_items-based T&M periods with a simpler model tied directly to work orders.

```text
tm_time_cards
  id              uuid PK
  change_order_id uuid FK -> change_order_projects
  entry_date      date
  -- FC fields (filled by field crew)
  fc_men_count    integer (number of workers)
  fc_hours_per_man numeric (hours each man worked)
  fc_man_hours    numeric (generated: men x hours)
  fc_description  text
  fc_entered_by   uuid
  fc_submitted_at timestamptz (null = draft)
  -- TC fields (filled by trade contractor)
  tc_approved     boolean DEFAULT false
  tc_approved_by  uuid
  tc_approved_at  timestamptz
  tc_rejection_notes text
  tc_own_hours    numeric (TC's own hours, if any)
  tc_hourly_rate  numeric (rate TC sets)
  tc_total_cost   numeric (generated: (fc_man_hours + tc_own_hours) * rate)
  tc_submitted_at timestamptz (null = not yet sent to GC)
  -- GC fields
  gc_acknowledged boolean DEFAULT false
  gc_acknowledged_by uuid
  gc_acknowledged_at timestamptz
  -- Metadata
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()
```

### 3. RLS Policies on `tm_time_cards`

- FC can INSERT and UPDATE (only their own entries, only fc_* fields, only before tc_approved)
- TC can read all cards for their work orders, UPDATE tc_* fields, and approve/reject
- GC can read approved+submitted cards only, UPDATE gc_acknowledged fields only
- Follows existing project_team membership checks

---

## UI Changes

### Step 1: New Wizard Step -- "Pricing Mode" (after Work Type, before Resources)

A simple two-button choice inserted as Step 4 in the Work Order Wizard:

```text
  [Fixed Price]     [Time & Material]

  Fixed Price: Set a total price upfront.
  T&M: Track hours daily. Pay for actual time worked.
```

The wizard steps become: Title, Location, Work Type, **Pricing Mode**, Resources, Assignment, Review.

### Step 2: Work Order Detail Page -- T&M Tab/Section

When a work order has `pricing_mode = 'tm'`, the detail page shows a **Time Cards** section instead of the fixed-price FC Hours / TC Pricing panels. This section contains:

**For Field Crew:**
- "Add Time Card" button (opens a simple form)
- Form fields: Date, Number of Men, Hours per Man (auto-calculates Man-Hours), Description
- List of their submitted cards with status badges (Draft, Submitted, Approved, Rejected)
- Can edit cards until submitted; can resubmit rejected cards

**For Trade Contractor:**
- Sees FC's submitted cards awaiting approval
- Approve/Reject buttons on each card
- Can add their own hours to each card
- Sets the hourly rate (applies to all cards or per-card)
- "Submit to GC" button sends approved cards upstream
- Running total: Total Man-Hours, Total Cost

**For General Contractor:**
- Sees only TC-submitted (approved) cards
- Each card shows: Date, Man-Hours, Cost
- Checkbox to acknowledge each entry
- Running total at top: Total Hours | Total Cost | Acknowledged vs Pending

### Step 3: Work Order Card Badge

On the work order list/cards, show a small "T&M" badge next to the status for T&M work orders, so users can distinguish them at a glance.

---

## Files Changed

| File | Change |
|---|---|
| `supabase/migrations/` | New migration: add `pricing_mode` column + `tm_time_cards` table + RLS |
| `src/types/changeOrderProject.ts` | Add `pricing_mode` to `ChangeOrderProject` type |
| `src/types/workOrderWizard.ts` | Add `pricing_mode` to `WorkOrderWizardData` |
| `src/components/work-order-wizard/steps/PricingModeStep.tsx` | **New** -- Fixed Price vs T&M chooser |
| `src/components/work-order-wizard/WorkOrderWizard.tsx` | Insert new step, update step count |
| `src/hooks/useChangeOrderProject.ts` | Pass `pricing_mode` in create mutation |
| `src/components/change-order-detail/TMTimeCardsPanel.tsx` | **New** -- main T&M panel with role-based views |
| `src/components/change-order-detail/TimeCardForm.tsx` | **New** -- FC time card entry form |
| `src/components/change-order-detail/TimeCardRow.tsx` | **New** -- single card display with actions |
| `src/components/change-order-detail/ChangeOrderDetailPage.tsx` | Conditionally show TMTimeCardsPanel when `pricing_mode = 'tm'` |
| `src/components/project/WorkOrdersTab.tsx` | Show "T&M" badge on cards |

## What Stays the Same

- Fixed-price work orders behave exactly as they do today -- no changes
- The existing `tm_periods` / `tm_labor_entries` system (tied to `work_items`) is untouched
- All existing RLS policies, roles, and permissions remain unchanged
- The approval flow (Draft -> FC Input -> TC Pricing -> Ready for Approval -> Approved -> Contracted) still applies; T&M just changes what happens inside those stages

