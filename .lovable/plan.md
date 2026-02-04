

# Plan: Reorganize Project Overview Layout

## Current State Analysis

The Project Overview tab currently has a **two-column layout** with sections scattered between operational data and project information:

```text
┌──────────────────────────────────────────────────────────────┐
│                Financial Summary Cards (full width)          │
├─────────────────────────────┬────────────────────────────────┤
│    LEFT COLUMN              │    RIGHT COLUMN                │
│  - Work Order Summary       │  - Scope & Project Details     │
│  - Invoice Summary          │  - Recent Activity             │
│  - Project Team             │                                │
│  - Contract Summary         │                                │
└─────────────────────────────┴────────────────────────────────┘
```

**Problem:** Project information (Team, Contracts, Scope) is mixed with operational summaries (Work Orders, Invoices), making it harder to find "project details" vs "what needs attention."

---

## Proposed Layout

Reorganize into three logical sections that answer distinct questions:

### Section 1: "Needs Attention" (Top Priority)
What requires action right now?

### Section 2: "Financial Snapshot"  
Where does the money stand?

### Section 3: "Project Details" (Collapsible)
Who's involved and what's the scope?

---

## New Layout Structure

```text
┌──────────────────────────────────────────────────────────────┐
│                    NEEDS ATTENTION                           │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │ Work Orders    │  │ Invoices       │  │ Recent Activity│  │
│  │ Summary        │  │ Summary        │  │                │  │
│  └────────────────┘  └────────────────┘  └────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│                  FINANCIAL SNAPSHOT                          │
│         (ProjectFinancialsSectionNew - existing)             │
├──────────────────────────────────────────────────────────────┤
│                   PROJECT DETAILS                            │
│  ┌─────────────────────────────┬─────────────────────────────┤
│  │  Team & Contracts           │   Scope & Structure         │
│  │  (Team Section)             │   (Scope Section)           │
│  │  (Contract Summary)         │                             │
│  └─────────────────────────────┴─────────────────────────────┘
└──────────────────────────────────────────────────────────────┘
```

---

## Desktop Layout (lg screens)

```text
ROW 1: 3-column grid for "Needs Attention"
  [Work Orders]  [Invoices]  [Activity]

ROW 2: Full width Financial Cards

ROW 3: 2-column grid for "Project Details"
  [Team + Contracts stacked]  [Scope]
```

---

## Mobile Layout (stacked)

All sections stack vertically with logical ordering:
1. Alert banner (if pending approvals)
2. Work Order Summary
3. Invoice Summary  
4. Financial Snapshot
5. Team (collapsible)
6. Contracts (collapsible)
7. Scope (collapsible)
8. Activity

---

## Technical Changes

### File: `src/pages/ProjectHome.tsx`

**Lines 204-227** - Reorganize the Overview tab content:

Current structure:
```tsx
{activeTab === 'overview' && (
  <div className="space-y-6">
    <ProjectFinancialsSectionNew projectId={id!} />
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <WorkOrderSummaryCard ... />
        <InvoiceSummaryCard ... />
        <ProjectTeamSection ... />
        <ProjectContractsSection ... />
      </div>
      <div className="space-y-6">
        <ProjectScopeSection ... />
        <ProjectActivitySection ... />
      </div>
    </div>
  </div>
)}
```

New structure:
```tsx
{activeTab === 'overview' && (
  <div className="space-y-8">
    {/* Section 1: Needs Attention - 3 columns on desktop */}
    <section>
      <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
        Needs Attention
      </h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <WorkOrderSummaryCard projectId={id!} />
        <InvoiceSummaryCard projectId={id!} />
        <ProjectActivitySection projectId={id!} />
      </div>
    </section>

    {/* Section 2: Financial Snapshot */}
    <section>
      <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
        Financial Snapshot
      </h2>
      <ProjectFinancialsSectionNew projectId={id!} />
    </section>

    {/* Section 3: Project Details - 2 columns */}
    <section>
      <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
        Project Details
      </h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ProjectTeamSection projectId={id!} />
          <ProjectContractsSection projectId={id!} />
        </div>
        <ProjectScopeSection projectId={id!} projectType={project.project_type} />
      </div>
    </section>
  </div>
)}
```

---

## Additional Enhancements

### Add Section Headers with Icons

Each section gets a clear header label to improve scannability:

| Section | Label | Icon (optional) |
|---------|-------|-----------------|
| Row 1 | "Needs Attention" | AlertTriangle or none |
| Row 2 | "Financial Snapshot" | DollarSign or none |
| Row 3 | "Project Details" | Building2 or none |

### Consistent Card Heights

The "Needs Attention" cards (Work Orders, Invoices, Activity) will be in a 3-column grid, ensuring visual alignment.

### Keep Collapsible Behavior

Team, Contracts, and Scope sections already have collapsible behavior - this is preserved.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/ProjectHome.tsx` | Reorganize Overview tab into 3 logical sections |

---

## Visual Comparison

**Before:**
- Financial cards at top
- Mixed operational + project info in 2 columns

**After:**
- "Needs Attention" (Work Orders, Invoices, Activity) at top - 3 columns
- Financial snapshot below
- "Project Details" (Team, Contracts, Scope) grouped together - 2 columns

This reorganization answers the user's request to make **Contracts, Team, and Project Details** more prominent and logically grouped, while keeping operational summaries at the top for quick action.

