

# Project Setup Wizard Adjustments

## Changes

### 1. `src/types/projectWizard.ts`
- Remove `'Stone Veneer'`, `'Stucco (Lath)'`, `'Brick Veneer'` from `SIDING_MATERIALS`
- Add `'T&G Wood'` to `FASCIA_SOFFIT_MATERIALS`
- Add new constant `EXTERIOR_DOOR_TYPES = ['Patio Doors', 'Entry Doors', 'Garage Doors'] as const`
- Add `roofDeckFinish?: 'Finished' | 'Unfinished'` and `roofDeckDecking?: string` to `ScopeDetails`
- Add `extDoorTypes?: string[]` to `ScopeDetails` (replaces boolean `extDoorsIncluded`)

### 2. `src/components/project-wizard-new/ScopeStep.tsx`

**Project Size card:**
- Remove the Lot Size field entirely
- Hide Bedrooms/Bathrooms for Townhomes (keep for Single Family and Duplex only)

**Unit Details card (Townhomes/Duplex):**
- Remove "Stories per Unit" dropdown (redundant with "Number of Floors" in Structure Details)

**Roof card:**
- When "Has Roof Deck?" is on, change the dropdown from `Framed/Concrete/Other` to `Finished/Unfinished`, and add a second dropdown for decking type (reuse `DECKING_TYPES`)

**Siding card:**
- Already renders from `SIDING_MATERIALS` constant, so the type change handles this automatically

**Fascia & Soffit card:**
- Already renders from `FASCIA_SOFFIT_MATERIALS`, so adding `T&G Wood` to the constant handles this

**Optional Scope Items — Exterior Doors:**
- Replace the single "installs Exterior Doors?" switch with a multi-select checkbox group: Patio Doors, Entry Doors, Garage Doors

### 3. `src/components/project-wizard-new/ContractsStep.tsx`

**Material Responsibility — More Prominent + TC Access:**
- Move the Material Responsibility section to the TOP of the contracts step as a highlighted card (with a colored border or background) so it stands out
- Currently only shown when `creatorRole === 'General Contractor'`. Change the condition to also show when `creatorRole === 'Trade Contractor'` and a GC exists on the team, allowing the TC to set it too
- Add a brief callout: "This determines who manages and pays for materials on this project."

### Files Modified
| File | Change |
|------|--------|
| `src/types/projectWizard.ts` | Update constants, add new types |
| `src/components/project-wizard-new/ScopeStep.tsx` | Remove lot size, hide townhome bedrooms/bathrooms, remove stories per unit, update roof deck, update exterior doors |
| `src/components/project-wizard-new/ContractsStep.tsx` | Promote material responsibility, allow TC to set it |

No database changes needed — these are all UI/type updates to the wizard form.

