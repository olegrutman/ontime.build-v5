

# Add Running Summary to the Project Details Wizard

## Problem
The `WizardSummaryPanel` was only added to `CreateProjectNew.tsx`. The `ProjectDetailsWizard.tsx` is a separate full-width wizard with a top-only progress bar — it has no sidebar and no summary panel.

## Approach
Add a compact, sticky summary sidebar to the ProjectDetailsWizard that shows selections made so far (project type, stories, foundation, roof, features) — updating live as the user progresses through steps.

## Changes

### 1. Create `DetailsSummaryPanel` component
**New file: `src/components/project-wizard-new/DetailsSummaryPanel.tsx`**

Accepts `ProfileDraft` and the selected `ProjectType` name. Renders:
- **Type**: e.g. "Custom Home"
- **Scale**: stories count, units, buildings (if applicable)
- **Structure**: foundation types, roof type (as badges)
- **Elements**: garage, basement, stairs (only if toggled on)
- **Features**: deck, pool, elevator, etc. (only if toggled on)

Each section only renders when data exists.

### 2. Update `ProjectDetailsWizard.tsx` layout
Convert from full-width single column to a 12-col grid (same pattern as `CreateProjectNew`):
- **Left col (3 cols, hidden on mobile)**: sticky card with step nav + `DetailsSummaryPanel`
- **Right col (9 cols)**: current step content

The existing top `ProgressBar` component stays on mobile; on desktop, the sidebar replaces it as the primary navigation reference.

### Layout
```text
Desktop:
┌──────────────┐  ┌─────────────────────────────┐
│ Steps 1-5    │  │                             │
│──────────────│  │   [Current Step Content]    │
│ Summary      │  │                             │
│ Custom Home  │  │                             │
│ 2 stories    │  │                             │
│ Slab on grade│  │                             │
│ Truss-gable  │  │                             │
│ ✓ Garage     │  │                             │
└──────────────┘  └─────────────────────────────┘

Mobile: keeps current top progress bar, no sidebar
```

