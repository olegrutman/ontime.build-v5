

# Include FC in Project Readiness Blocking Logic

## What Changes

Currently, Field Crew (FC) participants are excluded from the blocking readiness logic and shown only as an informational (non-blocking) item with a blue info icon. This change treats FC the same as GC and TC -- their invite acceptance will be a blocking requirement that counts toward the readiness percentage.

## Technical Changes

### `src/hooks/useProjectReadiness.ts`

1. **Remove the FC exclusion filter** (line 59): Stop filtering out FC from `blockingParticipants`. All participants (GC, TC, FC, SUPPLIER) will be treated equally for invite acceptance tracking.

2. **Remove the separate FC informational item** (lines 72-79, 105-108): No more special-case FC display. FC orgs will appear in the standard "Awaiting: ..." label alongside any other pending orgs.

3. **Remove the `informational` field usage for FC**: The `fc_accepted` item will no longer be appended separately.

**Before:**
- FC filtered out of blocking logic
- FC shown as blue informational item (does not affect percentage)

**After:**
- FC included in blocking logic alongside all other roles
- FC pending invites show in the standard "Awaiting: OrgName" label
- FC acceptance counts toward the readiness percentage

### No other file changes needed

The `ProjectReadinessCard` component already handles informational vs blocking items generically -- removing the FC special case in the hook is sufficient.

