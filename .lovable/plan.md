

# Move Step Description into Top Bar

## Problem
The centered step header (icon + title + description) at the top of each wizard step collides with the Dialog's close button (X) in the top-right corner. Padding adjustments haven't fully resolved this.

## Solution
Move the step title and subtitle into the `WizardProgress` top bar component, and remove the duplicated header blocks from all 8 step components. This keeps the description safely centered in the bar area, away from the X button.

## Technical Details

### 1. Update `STEPS` array in `WorkOrderWizard.tsx`
Add a `description` field to each step object:
```
{ title: 'Title', key: 'title', description: 'Give this work order a descriptive name' },
{ title: 'Location', key: 'location', description: 'Where is this work happening?' },
...etc
```

### 2. Update `WizardProgress.tsx`
- Accept `description` from the current step
- Display the step title centered (or left-aligned) with the description below it
- Layout: "Step X of Y" on the left, step title centered, progress dots below

### 3. Remove header blocks from all 8 step files
Remove the `<div className="text-center mb-6">...</div>` block (icon + title + description) from:
- `TitleStep.tsx`
- `LocationStep.tsx`
- `WorkTypeStep.tsx`
- `ScopeDetailsStep.tsx`
- `PricingModeStep.tsx`
- `ResourcesStep.tsx`
- `AssignmentStep.tsx`
- `ReviewStep.tsx`

Each step will then start directly with its form content.

### 4. Revert top padding
Change `pt-8` back to `pt-4` on the content wrapper in `WorkOrderWizard.tsx` since the extra padding was only needed to clear the old in-content header.
