

# Add Running Project Summary to Setup Wizard

## What
Replace the step-only sidebar with a sidebar that also shows a live rolling summary of all data entered so far — project name, type, location, team count — updating as the user fills in each step.

## Changes

### 1. Create `WizardSummaryPanel` component
**New file: `src/components/project-wizard-new/WizardSummaryPanel.tsx`**

A compact card that reads `NewProjectWizardData` and renders filled-in sections:
- **Project**: name, type, full address (only once basics are filled)
- **Start Date**: if provided
- **Team**: count of members added, listed by role (e.g., "2 Trade Contractors, 1 Field Crew")

Each section only appears once its data exists (no empty placeholders). Uses muted text and small type to stay unobtrusive.

### 2. Update `CreateProjectNew.tsx` sidebar
**File: `src/pages/CreateProjectNew.tsx`**

Add `<WizardSummaryPanel data={data} />` below the existing step nav in the left sidebar column. The step nav stays as-is for navigation; the summary panel sits underneath showing accumulated info.

### Layout
```text
┌─────────────────┐  ┌──────────────────────────┐
│ 1. Basics  ✓    │  │                          │
│ 2. Team   ●     │  │   [Current Step Form]    │
│ 3. Review       │  │                          │
│─────────────────│  │                          │
│ Project Summary  │  │                          │
│ Maple Ridge...  │  │                          │
│ Single Family   │  │                          │
│ Denver, CO      │  │                          │
│ Team: 3 members │  │                          │
└─────────────────┘  └──────────────────────────┘
```

