

# Simplify Work Order Wizard Assignment Step

## Problem
The Assignment step (Step 7) shows redundant information -- the same team members appear in both the "Assign To" dropdown and the "Additional Participants" toggle list below it. The user wants to keep only the primary assignee selector and remove the Additional Participants section entirely.

## Change

### File: `src/components/work-order-wizard/steps/AssignmentStep.tsx`

Remove the "Additional Participants" section (lines 193-218), including:
- The `toggleableParticipants` memo (lines 126-139)
- The `toggleParticipant` handler (lines 141-150)
- The `participantToggles` state (line 40)
- The toggle initialization logic in the useEffect (lines 101-106)
- The JSX block rendering the participant toggles (lines 193-218)

Keep only the primary "Assign to" dropdown selector.

### File: `src/types/workOrderWizard.ts`

Remove `participant_org_ids` from `WorkOrderWizardData` interface and initial data, since it's no longer used.

### Files Modified
1. `src/components/work-order-wizard/steps/AssignmentStep.tsx` -- remove Additional Participants section and related state/logic
2. `src/types/workOrderWizard.ts` -- remove `participant_org_ids` field

