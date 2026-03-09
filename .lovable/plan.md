

# Bug Fix: Removed Team Members Still Appear in Project Readiness

## Problem

When a team member is removed from the project via the Team card, the **Project Readiness** checklist continues to show items related to that removed role (e.g., "Awaiting FC", "Contract sum with FC entered"). This happens because:

1. **TC-created project checklist unconditionally adds GC and FC items** (lines 160-195 in `useProjectReadiness.ts`). Even after the participant and contract are deleted, the readiness still shows "Awaiting FC" and "Contract sum with FC" as incomplete items.

2. **GC-created project checklist** has a similar issue with TC-related items always appearing.

The checklist should be **dynamic** — only showing acceptance and contract items for roles that are actually part of the project team.

## Root Cause

In `useProjectReadiness.ts`:
- For TC projects: GC contract sum, FC contract sum, GC SOV, FC SOV, GC accepted, and FC accepted items are **always** added to the checklist regardless of whether those roles exist in the team
- The GC checklist conditionally shows FC (`if (fcInvited)`) but always shows TC items

## Fix

### `src/hooks/useProjectReadiness.ts`

Make checklist items conditional on the existence of the relevant contract or participant:

**TC-created project:**
- Only show "Contract sum with GC" if a GC contract exists
- Only show "Contract sum with FC" if an FC contract exists  
- Only show "SOV for GC contract" if a GC contract exists
- Only show "SOV for FC contract" if an FC contract exists
- Only show "GC accepted" if there are GC participants
- Only show "FC accepted" if there are FC participants

**GC-created project:**
- Only show "Contract sum with TC" if a TC contract exists
- Only show "TC accepted" if there are TC participants
- (FC is already conditional)

This makes the readiness reflect the **current** team composition. When a member is removed and re-added, items reappear naturally.

### No other file changes needed
The `onTeamChanged -> recalculate` wiring is already correct. The cascading delete logic in `TeamMembersCard` is already working. The only issue is the checklist generation logic being unconditional.

