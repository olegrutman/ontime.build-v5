

# Fix X Button Overlapping Step Description

## Problem
The Dialog close button (X) in the top-right corner overlaps with the step header/description text that sits at the top of each wizard step.

## Solution
Add top padding to the content area inside `WorkOrderWizard.tsx` so step content clears the close button. This is a single-line change.

## Technical Details

### File: `src/components/work-order-wizard/WorkOrderWizard.tsx`
- The step content container currently has class `p-6 min-h-[400px] max-h-[60vh] overflow-y-auto`
- Change to `px-6 pb-6 pt-2 min-h-[400px] max-h-[60vh] overflow-y-auto` -- reducing top padding since the WizardProgress bar already provides separation, and the X button sits in the DialogContent header area above

Alternatively (and more robustly): each step's header block uses `text-center mb-6` at the top. We can keep the existing padding but simply not center the step titles at the very top where they collide with the X. However, the simplest fix is just ensuring the dialog close button does not overlap by adjusting DialogContent or step padding.

The cleanest approach: since each step has a centered icon + title + description block, add `pt-2` to the content wrapper so the centered content naturally sits below the X button area. The X button from Radix Dialog typically sits at `top: 1rem; right: 1rem`, so the existing `p-6` should clear it -- but if it doesn't, we'll bump the top padding slightly or move the step descriptions to have more top margin.

### Single change in `WorkOrderWizard.tsx`
- Content div: add extra top spacing (e.g., `pt-8` instead of `p-6`, or `p-6 pt-8`)

